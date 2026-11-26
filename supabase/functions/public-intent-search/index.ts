import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
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
 const businessId=body.business_id;if(!businessId)return json({error:"business_id required"},400);
 const {data:business,error:bErr}=await client.from("businesses").select("id,name,owner_user_id,business_type,niche,description,location,services,audience").eq("id",businessId).single();
 if(bErr||business.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const {data:source,error:sourceErr}=await client.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","gdelt_free_news_search").maybeSingle();
 if(sourceErr)return json({status:"source_catalog_error",error:"Source permission status could not be checked; search blocked."},503);
 if(!source?.enabled||!source?.terms_reviewed)return json({status:"provider_disconnected",error:"GDELT source disabled pending owner approval of attribution and source terms."},403);
 const niche=business.niche||business.business_type||business.name,area=body.area||business.location||"India";
 const services=(business.services||[]).slice(0,4).join(" ")||niche;
 const keywords=Array.isArray(body.keywords)?body.keywords.slice(0,2).map((k:string)=>String(k)):[];
 const queries=['"' + niche + '" "' + area + '"',services + ' "' + area + '"',...keywords.map((k:string)=>k + ' "' + area + '"')].slice(0,3);
 const results:Array<{query:string,title:string,url:string,domain:string,date:string}>=[];
 try{
 let last=0;
 for(const query of queries){
  if(last)await pause(Math.max(0,5000-(Date.now()-last)));
  const endpoint=new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  endpoint.searchParams.set("query",query);endpoint.searchParams.set("mode","ArtList");endpoint.searchParams.set("format","json");endpoint.searchParams.set("maxrecords","20");endpoint.searchParams.set("timespan","7d");endpoint.searchParams.set("sort","DateDesc");endpoint.searchParams.set("sourcecountry","India");
  last=Date.now();
  const response=await fetch(endpoint,{headers:{"Accept":"application/json"}});
  if(!response.ok)return json({status:"provider_error",provider_status:response.status,message:"GDELT free search failed; retry later."},502);
  const data=await response.json();if(!Array.isArray(data.articles))return json({status:"provider_error",message:"GDELT response format unexpected"},502);
  for(const item of data.articles){try{const parsed=new URL(item.url);if(["http:","https:"].includes(parsed.protocol))results.push({query,title:item.title||"",url:parsed.href,domain:item.domain||parsed.hostname,date:item.seendate||""});}catch{}}
 }
 }catch{return json({status:"provider_error",message:"GDELT connection failed. Retry later."},502);}
 const unique=[...new Map(results.filter(r=>r.url).map(r=>[r.url,r])).values()];
 return json({status:"candidates_found",provider:"GDELT Project free news search",business:{name:business.name,area,niche,services},queries,results:unique.slice(0,30),count:unique.length,attribution:"Data source: GDELT Project — https://www.gdeltproject.org/",warning:"News mentions are weak signals only, not buyer intent or confirmed leads. Review the article and evidence before saving; no contacts are scraped and no CRM leads are automatically created."});
});