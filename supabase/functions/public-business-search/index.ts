import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clean = (value: unknown, max = 100) => String(value ?? "").trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "POST required" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond({ error: "Invalid JSON" }, 400); }
  const query = clean(body.query, 100);
  const area = clean(body.area, 100);
  if (!query && !area) return respond({ error: "Enter a product, service, category or area to search." }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return respond({ error: "Server configuration unavailable" }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let request = db.from("businesses")
    .select("id,name,business_type,niche,description,location,services,website,phone,public_phone_enabled")
    .eq("public_listing_enabled", true)
    .limit(20);
  if (query) request = request.or(`name.ilike.%${query}%,business_type.ilike.%${query}%,niche.ilike.%${query}%,description.ilike.%${query}%`);
  if (area) request = request.ilike("location", `%${area}%`);
  const { data, error } = await request;
  if (error) return respond({ error: "Directory search unavailable" }, 503);

  const businesses = (data || []).map((business) => ({
    id: business.id,
    name: business.name,
    category: business.niche || business.business_type || "",
    description: business.description || "",
    location: business.location || "",
    services: business.services || [],
    website: business.website || null,
    phone: business.public_phone_enabled ? business.phone || null : null,
  }));
  return respond({
    status: "ok",
    count: businesses.length,
    businesses,
    message: businesses.length ? "Showing businesses that opted into public discovery." : "No opted-in businesses match yet. Try a different search or area.",
    privacy: "Only businesses that enabled public listing appear. Phone numbers are shown only when the owner separately opted in.",
  });
});
