import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const safe=(s:any)=>String(s||"").trim();
const freeTemplates=(business:any,type:string,body:any)=>{
 const name=safe(business.name),niche=safe(business.niche||business.business_type),area=safe(business.location),services=Array.isArray(business.services)?business.services.map(safe).filter(Boolean):safe(business.services).split(",").map((s:string)=>s.trim()).filter(Boolean);
 const offer=services[0]||niche||"हमारी सेवाएं",lang=safe(body.language||"Hindi and simple English");
 const contact=business.phone?("संपर्क: "+business.phone):"अपनी आवश्यकता बताने के लिए हमें संदेश भेजें";
 const hindi=/(hindi|हिंदी|हिन्दी)/i.test(lang);
 const hashtags=["#"+niche.replace(/[^a-zA-Z0-9]/g,""),"#"+area.split(",")[0].replace(/[^a-zA-Z0-9]/g,""),"#LocalBusiness"].filter(h=>h.length>1).join(" ");
 const postsHindi=[
  ["काम की सलाह",offer+" चुनने से पहले अपनी जरूरत, बजट और जरूरी सवाल लिख लें। इससे सही विकल्प समझने में मदद मिलेगी।",offer+" के बारे में सहायता चाहिए? "+contact],
  ["स्थानीय जानकारी",area+" में "+offer+" चाहिए? अपनी जरूरत बताएं, हम उपलब्ध विकल्पों की जानकारी देने में मदद करेंगे। "+contact],
  ["सामान्य सवाल",offer+" के बारे में शुरुआत समझ नहीं आ रही? अपना सवाल या जरूरत भेजें, हम मार्गदर्शन करेंगे। "+contact],
  ["योजना बनाएं","समय बचाने के लिए अपनी जरूरत, पसंदीदा समय और सवाल पहले लिख लें। "+name+" से संपर्क करें। "+contact],
  ["पूछताछ आमंत्रण",area+" में "+offer+" के लिए जरूरत है? क्या चाहिए और कब चाहिए—विवरण भेजें। "+contact]
 ];
 const postsEnglish=[
  ["Useful tip","Before choosing "+offer+", list your requirement, budget and questions to help compare options.","Need help with "+offer+"? "+contact],
  ["Local help","Looking for "+offer+" in "+area+"? Share your requirement and we can help explain available options. "+contact],
  ["Common question","Not sure where to start with "+offer+"? Send your question or requirement for guidance. "+contact],
  ["Planning reminder","Save time by noting your requirement, preferred timing and questions. Contact "+name+". "+contact],
  ["Open enquiry","Need "+offer+" in "+area+"? Tell us what you need and when. "+contact]
 ];
 const posts=hindi?postsHindi:postsEnglish;
 const faqHindi=["FAQs (template—publish se pehle review karein)","1. आप क्या सेवाएं/प्रोडक्ट देते हैं?\n"+(services.length?services.join(", "):niche)+" — "+area+".","2. आपका सेवा क्षेत्र क्या है?\nहमारी प्रोफाइल में "+area+" दर्ज है; कृपया उपलब्धता की पुष्टि करें।","3. जानकारी कैसे मांगें?\n"+(business.phone?"संपर्क: "+business.phone:"हमारे संपर्क माध्यम पर")+" अपनी जरूरत भेजें।","4. पूछताछ में क्या बताएं?\nप्रोडक्ट/सेवा, पसंदीदा क्षेत्र और जरूरी विवरण बताएं।","5. क्या पहले सवाल पूछ सकते हैं?\nहां, आगे बढ़ने से पहले अपने सवाल भेजें।","6. सही विकल्प कैसे चुनें?\nअपनी जरूरत बताएं ताकि उपलब्ध जानकारी के आधार पर विकल्प समझ सकें।","7. वेबसाइट उपलब्ध है?\n"+(business.website||"वेबसाइट दर्ज नहीं है; सीधे संपर्क करें।"),"8. संपर्क कैसे करें?\n"+contact];
 const faqEnglish=["FAQs (template; review before publishing)","1. What do you provide?\n"+(services.length?services.join(", "):niche)+" in "+area+".","2. Where do you serve?\nListed area: "+area+"; please confirm availability.","3. How can I enquire?\n"+(business.phone?"Contact: "+business.phone:"Contact the business")+" and share your requirement.","4. What details should I share?\nProduct/service, preferred area and key requirements.","5. Can I ask questions first?\nYes, send questions before proceeding.","6. How do I choose?\nShare your needs so available options can be discussed.","7. Is there a website?\n"+(business.website||"No website is listed in the profile."),"8. How do I contact you?\n"+contact];
 if(type==="faq")return {content:(hindi?faqHindi:faqEnglish).join("\n\n"),language:lang,disclaimer:"Free business-specific template; not AI-generated. Review and confirm every detail before publishing."};
 if(type==="campaign")return {content:(hindi?["ऑर्गेनिक कैंपेन टेम्पलेट","उद्देश्य: "+offer+" के लिए वास्तविक स्थानीय पूछताछ बढ़ाने में मदद।","ऑडियंस: "+area+" में "+niche+" के बारे में जानकारी खोज रहे लोग।","विषय: ग्राहक को अपनी जरूरत समझने में मदद वाली सरल चेकलिस्ट।","पोस्ट 1: "+posts[0][1],"पोस्ट 2: "+posts[2][1],"पोस्ट 3: "+posts[4][1],"CTA: "+contact,"सुझाव: एक सप्ताह में 3 पोस्ट; वास्तविक प्रतिक्रिया के अनुसार बदलें।","मापें: उपयोगी सवाल, वास्तविक पूछताछ, जवाब दर और योग्य पूछताछ—likes को lead न मानें."]:["Organic campaign template","Goal: Encourage genuine local enquiries for "+offer+".","Audience: People in "+area+" researching "+niche+".","Topic: A useful checklist to clarify customer needs.","Post 1: "+posts[0][1],"Post 2: "+posts[2][1],"Post 3: "+posts[4][1],"CTA: "+contact,"Suggested cadence: 3 posts across one week; adjust based on real engagement.","Measure relevant questions, genuine enquiries, response rate and qualified enquiries—not likes alone."]).join("\n\n"),language:lang,disclaimer:"Free template campaign; not AI-generated. Review business details and claims."};
 return {content:posts.map((p,i)=>((hindi?"पोस्ट ":"Post ")+(i+1)+": "+p[0]+"\n"+p[1]+"\nCTA: "+(p[2]||contact)+"\n"+hashtags)).join("\n\n"),language:lang,disclaimer:"Free business-specific template; not AI-generated. Review all details and contact information before publishing."};
};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return json({error:"Supabase configuration missing"},500);
 const auth=req.headers.get("Authorization")||"";
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:authError}=await userClient.auth.getUser();
 if(authError||!user)return json({error:"Sign-in required"},401);
 let body;try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const businessId=String(body.business_id||"");
 if(!businessId)return json({error:"business_id required"},400);
 const {data:business,error:bErr}=await userClient.from("businesses").select("id,name,owner_user_id,business_type,niche,description,location,services,phone,website").eq("id",businessId).single();
 if(bErr||business.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const type=String(body.type||"posts");
 if(!["posts","faq","campaign"].includes(type))return json({error:"Unsupported content type"},400);
 const key=Deno.env.get("OPENAI_API_KEY");
 if(!key){const fallback=freeTemplates(business,type,body);return json({status:"template_generated",type,model:"free-local-template-engine",content:fallback.content,language:fallback.language,disclaimer:fallback.disclaimer});}
 const model=Deno.env.get("OPENAI_MODEL")||"gpt-6.2-astra";
 const services=Array.isArray(business.services)?business.services.join(", "):String(business.services||"");
 const instructions="You are an organic local-business marketing assistant. Produce truthful, non-spammy content in the language requested. Do not invent prices, guarantees, certifications, offers, reviews, customer stories, availability or facts. Keep it local and useful, avoid exaggerated claims and ad-like pressure. Use the supplied business details only. If details are missing, ask questions rather than fabricate.";
 const input={business_name:business.name,niche:business.niche||business.business_type,description:business.description,area:business.location,services,phone:business.phone,website:business.website,language:body.language||"Hindi and simple English",goal:body.goal||"organic enquiries",type,topic:body.topic||""};
 const prompt=type==="faq"?"Create 8 practical FAQs with concise answers, grounded only in business details. Return plain text with numbered Q/A.":type==="campaign"?"Create one organic campaign plan: audience, topic, 3 post variations, CTA, suggested cadence and measurement. Return concise plain text.":"Create 5 distinct organic social posts for this local business. Each includes a short title, body, useful customer tip, soft CTA and relevant hashtags. Return numbered plain-text posts.";
 const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model,instructions,input:prompt+"\nBusiness data (JSON): "+JSON.stringify(input),max_output_tokens:1200})});
 if(!response.ok)return json({status:"provider_error",provider_status:response.status,error:"AI provider request failed. Check API key, model access, billing and quota."},502);
 const data=await response.json();
 const output=(Array.isArray(data.output)?data.output:[]).flatMap((o:any)=>Array.isArray(o.content)?o.content:[]).filter((c:any)=>c.type==="output_text").map((c:any)=>c.text||"").join("\n").trim();
 if(!output)return json({status:"empty_response",error:"AI provider returned no text output."},502);
 return json({status:"generated",type,model,content:output});
});