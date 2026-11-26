import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const safe=(s:any)=>String(s||"").trim();
const freeTemplates=(business:any,type:string,body:any)=>{
 const name=safe(business.name),niche=safe(business.niche||business.business_type),area=safe(business.location),services=Array.isArray(business.services)?business.services.map(safe).filter(Boolean):safe(business.services).split(",").map((s:string)=>s.trim()).filter(Boolean);
 const offer=services[0]||niche||"our services",lang=safe(body.language||"Hindi and simple English");
 const contact=business.phone?("Contact: "+business.phone):"Message us to ask about availability";
 const hashtags=["#"+niche.replace(/[^a-zA-Z0-9]/g,""),"#"+area.split(",")[0].replace(/[^a-zA-Z0-9]/g,""),"#LocalBusiness"].filter(h=>h.length>1).join(" ");
 const posts=[
  ["Useful tip","Before choosing "+offer+", list your main requirement and budget range. It makes it easier to compare options and ask the right questions.","Need help with "+offer+"? "+contact],
  ["Local help","Looking for "+offer+" in "+area+"? Tell us what you need and we will help you understand the available options. "+contact],
  ["Common question","Not sure where to start with "+offer+"? Share your question or requirement. We can guide you on the next step. "+contact],
  ["Planning reminder","A little planning can save time: note your requirement, preferred timing and questions before contacting a provider. For "+offer+", reach out to "+name+". "+contact],
  ["Open enquiry","Have a requirement for "+offer+"? Send the details—what you need and where you need it in "+area+". "+contact]
 ];
 if(type==="faq")return {content:["FAQs (template; review before publishing)","1. What services do you provide?\nWe offer "+(services.length?services.join(", "):niche)+" in "+area+".","2. Where do you serve?\nOur listed business area is "+area+". Please confirm service availability.","3. How can I request information?\nContact us at "+(business.phone||"our business contact channel")+" and share your requirement.","4. What details should I share?\nDescribe the service/product you need, preferred area and any important requirements.","5. Can I ask questions before proceeding?\nYes. Send your questions so we can respond with relevant information.","6. How do I know what is suitable?\nTell us your needs and we can discuss options based on the information available.","7. Do you have a website?\n"+(business.website||"A website is not listed in the business profile. Contact us directly for information."),"8. How do I get in touch?\n"+contact].join("\n\n"),language:lang,disclaimer:"Template-generated content; not AI output. Check every detail before publishing."};
 if(type==="campaign")return {content:["Organic campaign template","Goal: Encourage genuine local enquiries for "+offer+".","Audience: People in "+area+" who are actively researching "+niche+".","Topic: A practical checklist to help customers understand their requirement.","Post 1: "+posts[0][1],"Post 2: "+posts[2][1],"Post 3: "+posts[4][1],"CTA: "+contact,"Suggested cadence: 3 posts across one week; adjust based on real engagement.","Measure: Relevant questions, genuine enquiries, response rate and qualified enquiries. Avoid counting likes as leads."].join("\n\n"),language:lang,disclaimer:"Template campaign; not AI output. Confirm local audience, services and details."};
 return {content:posts.map((p,i)=>("Post "+(i+1)+": "+p[0]+"\n"+p[1]+"\nCTA: "+p[2]+"\n"+hashtags)).join("\n\n"),language:lang,disclaimer:"Template-generated content; not AI output. Review claims and contact details before publishing."};
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