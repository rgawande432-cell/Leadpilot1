import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return json({error:"Supabase configuration missing"},500);
 const auth=req.headers.get("Authorization")||"";
 const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return json({error:"Sign-in required"},401);
 let body;try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const businessId=String(body.business_id||"");
 if(!businessId)return json({error:"business_id required"},400);
 const {data:b,error:bErr}=await client.from("businesses").select("id,owner_user_id").eq("id",businessId).single();
 if(bErr||b.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const {data:sources,error:sErr}=await client.from("ai_discovery_sources").select("source_key,display_name,enabled,requires_credentials,terms_reviewed").order("display_name");
 if(sErr)return json({error:"Source catalog unavailable"},500);
 const brave=sources.find(s=>s.source_key==="brave_public_web_search");
 const gdelt=sources.find(s=>s.source_key==="gdelt_free_news_search");
 return json({status:"checked",providers:{brave_public_search:{configured:!!Deno.env.get("BRAVE_SEARCH_API_KEY"),enabled:!!brave?.enabled,terms_reviewed:!!brave?.terms_reviewed},gdelt_news_search:{configured:true,enabled:!!gdelt?.enabled,terms_reviewed:!!gdelt?.terms_reviewed},openai_content_generation:{configured:!!Deno.env.get("OPENAI_API_KEY")},meta_facebook_instagram:{connected:false},google_business_profile:{connected:false},whatsapp_opt_in:{connected:false}},catalog:sources.map(s=>({source_key:s.source_key,display_name:s.display_name,enabled:s.enabled,credentials_required:s.requires_credentials,terms_reviewed:s.terms_reviewed})),checked_at:new Date().toISOString(),note:"Credentials are never returned. Provider state reflects configured credentials and the approved source catalog."});
});