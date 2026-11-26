import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const respond = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: cors });

const normalizePhone = (v = "") => String(v).replace(/\D/g, "");
const normalizeEmail = (v = "") => String(v).trim().toLowerCase();

function scoreLead(message: string, phone: string, email: string) {
  const text = message.toLowerCase();
  let score = phone ? 20 : 0;
  if (email) score += 10;
  if (message.length >= 20) score += 15;
  if (["price", "buy", "purchase", "order", "book", "availability", "quote", "quotation", "rate"].some(w => text.includes(w))) score += 25;
  if (["urgent", "today", "aaj", "abhi", "jaldi", "immediately"].some(w => text.includes(w))) score += 15;
  if (["details", "information", "info", "enquiry", "inquiry", "interested"].some(w => text.includes(w))) score += 10;
  score = Math.min(score, 100);
  return { score, priority: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond(405, { success: false, error: "POST required" });

  try {
    const body = await req.json();
    // Honeypot: return a neutral success response to bots without saving a lead.
    if (String(body.website_check || body.websiteCheck || "").trim()) return respond(202, { success: true, message: "Enquiry accepted" });
    const businessId = String(body.business_id || body.businessId || "").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();
    const source = String(body.source || "Website").trim().slice(0, 80);
    const consent = body.consent === true;
    const consentText = "I agree to share my contact details and enquiry with this business so they can respond to my request.";
    if (!consent) return respond(400, { success: false, error: "Consent is required before submitting this enquiry." });

    if (!businessId || !name || !message || (!phone && !email))
      return respond(400, { success: false, error: "Business ID, name, message and phone or email are required" });
    if (name.length > 100 || message.length > 2000)
      return respond(400, { success: false, error: "Name or message exceeds allowed length" });
    if (phone && !/^[+\d\s()-]{7,20}$/.test(phone))
      return respond(400, { success: false, error: "Invalid phone number" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return respond(400, { success: false, error: "Invalid email address" });
    if (/^(.)\1{19,}$/.test(message))
      return respond(422, { success: false, error: "Message rejected by spam screening" });
    const links = message.match(/https?:\/\/\S+/gi) || [];
    if (links.length > 3 || /\b(casino|lottery|crypto giveaway|earn money fast|click here now)\b/i.test(message))
      return respond(422, { success: false, error: "Message rejected by spam screening" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return respond(500, { success: false, error: "Server configuration unavailable" });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: business, error: businessError } = await db
      .from("businesses").select("id").eq("id", businessId).maybeSingle();
    if (businessError) return respond(500, { success: false, error: "Could not verify business" });
    if (!business) return respond(404, { success: false, error: "Business not found" });

    // Rate limit repeat submissions by a hashed contact identifier; raw contact data is not stored in this table.
    const contactKey = normalizePhone(phone) || normalizeEmail(email);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(businessId + ":" + contactKey));
    const contactHash = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
    const { data: rateAllowed, error: rateError } = await db.rpc("leadpilot_check_intake_rate", { p_business_id: businessId, p_contact_hash: contactHash, p_limit: 5, p_window_minutes: 15 });
    if (rateError) return respond(500, { success: false, error: "Rate-limit validation failed" });
    if (!rateAllowed) return respond(429, { success: false, error: "Too many enquiry attempts from this contact. Please wait 15 minutes before retrying." });

    // Atomic duplicate check against normalized contact details, scoped to this business.
    const { data: duplicate, error: duplicateError } = await db.rpc("leadpilot_public_enquiry_duplicate", { p_business_id: businessId, p_phone: phone, p_email: email });
    if (duplicateError) return respond(500, { success: false, error: "Duplicate check failed" });
    if (duplicate) return respond(409, { success: false, duplicate: true, error: "An enquiry from this contact already exists" });

    const { score, priority } = scoreLead(message, phone, email);
    const { data: lead, error: insertError } = await db.from("leads").insert({
      business_id: businessId, name, phone: phone || null, email: email || null,
      message, source, score, status: "New", consent_at: new Date().toISOString(), consent_text: consentText,
    }).select("id,business_id,name,email,phone,message,source,status,score,created_at").single();

    if (insertError?.code === "23505") return respond(409, { success: false, duplicate: true, error: "An enquiry from this contact already exists" });
    if (insertError) return respond(500, { success: false, error: "Could not save enquiry" });
    return respond(201, { success: true, lead, priority });
  } catch (_error) {
    return respond(400, { success: false, error: "Invalid request body" });
  }
});
