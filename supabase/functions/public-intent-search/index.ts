import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return json({error:"Supabase configuration missing"},500);
 const auth=req.headers.get("Authorization")||"";
 const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return json({error:"Sign-in required"},401);
 let body;try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const businessId=body.business_id;if(!businessId)return json({error:"business_id required"},400);
 const {data:business,error:bErr}=await client.from("businesses").select("id,name,owner_user_id,business_type,niche,description,location,services,audience").eq("id",businessId).single();
 if(bErr||business.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const {data:braveSource,error:sourceErr}=await client.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","brave_public_web_search").maybeSingle();
 if(sourceErr)return json({status:"source_catalog_error",error:"Source permission status could not be checked; search is blocked."},503);
 if(!braveSource?.enabled||!braveSource?.terms_reviewed)return json({status:"provider_disconnected",error:"Brave source is disabled or terms review is incomplete. Owner approval is required before public search."},403);
 const key=Deno.env.get("BRAVE_SEARCH_API_KEY");
 if(!key)return json({status:"provider_disconnected",error:"BRAVE_SEARCH_API_KEY is not configured. Set it in Supabase Edge Function Secrets to run live public-web discovery."},503);
 const niche=business.niche||business.business_type||business.name;
 const area=body.area||business.location||"India";
 const services=(business.services||[]).slice(0,4).join(" ")||niche;
 const queries=[`"${niche}" looking for ${area}`,`need ${services} near ${area}`,`"${niche}" price quote ${area}`,`recommend ${niche} ${area}`,`"${niche}" buyer requirement ${area}`];
 const results=[];
 for(const query of queries){
  const endpoint=new URL("https://api.search.brave.com/res/v1/web/search");
  endpoint.searchParams.set("q",query);endpoint.searchParams.set("country","IN");endpoint.searchParams.set("search_lang","en");endpoint.searchParams.set("count","5");endpoint.searchParams.set("freshness","pm");
  const response=await fetch(endpoint,{headers:{"Accept":"application/json","X-Subscription-Token":key}});
  if(!response.ok)return json({status:"provider_error",provider_status:response.status,message:"Search provider request failed. Check key, plan and quota."},502);
  const data=await response.json();
  for(const item of (data.web?.results||[])){try{const parsed=new URL(item.url);if(!["http:","https:"].includes(parsed.protocol))continue;results.push({query,title:item.title||"",url:parsed.href,snippet:item.description||"",source_domain:parsed.hostname});}catch{continue;}}
 }
 const unique=[...new Map(results.filter(r=>r.url).map(r=>[r.url,r])).values()];
 return json({status:"candidates_found",business:{name:business.name,area,niche,services},queries,results:unique.slice(0,25),count:unique.length,warning:"Search snippets are unverified candidates, not confirmed leads. Review source page, consent and relevance before saving. No contacts are scraped and no CRM leads are automatically created."});
});