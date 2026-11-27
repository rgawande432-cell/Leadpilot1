import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { fetchNewsCandidates } from "../_shared/news-search-provider.js";
import { saveDiscoveryCandidates } from "../_shared/discovery-candidate-processing.js";
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
 const businessId=body.business_id;if(!businessId)return json({error:"business_id required"},400);
 const {data:business,error:bErr}=await client.from("businesses").select("id,name,owner_user_id,business_type,niche,description,location,services,audience").eq("id",businessId).single();
 if(bErr||business.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const {data:source,error:sourceErr}=await client.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","gdelt_free_news_search").maybeSingle();
 if(sourceErr)return json({status:"source_catalog_error",error:"Source permission status could not be checked; search blocked."},503);
 if(!source?.enabled||!source?.terms_reviewed)return json({status:"provider_disconnected",error:"Free news source disabled pending terms review."},403);
 if(body.action==="save"){
  const candidate=body.candidate;
  if(!candidate||typeof candidate!=="object")return json({error:"candidate required"},400);
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!service)return json({error:"Server configuration missing"},500);
  const admin=createClient(url,service);
  const {data:cfg}=await admin.from("ai_discovery_configs").select("keywords").eq("business_id",businessId).maybeSingle();
  const terms=[business.niche,business.business_type,...(business.services||[]),...(cfg?.keywords||[])].filter(Boolean);
  const savedCount=await saveDiscoveryCandidates({admin,businessId,candidates:[candidate],terms,mode:"text_intent",sourceName:"GDELT/Google News RSS (owner-reviewed)",maxCandidates:1});
  return json({status:savedCount?"saved_pending_review":"not_relevant",saved_count:savedCount,warning:"Candidate saved as pending verification only; it is not a verified lead."});
 }
 const {data:cfg}=await client.from("ai_discovery_configs").select("keywords").eq("business_id",businessId).maybeSingle();
 const configuredKeywords:string[]=(cfg?.keywords||[]).filter(Boolean).slice(0,2);
 const niche=business.niche||business.business_type||business.name,area=body.area||business.location||"India";
 const serviceTerms=(business.services||[]).filter(Boolean).slice(0,4).join(" ")||niche;
 const queryList=[`"${niche}" "${area}"`,`"${serviceTerms}" "${area}"`,`"${niche}" "${area}" "looking for"`,`"${serviceTerms}" "${area}" "request quote"`,...configuredKeywords.map((k:string)=>`"${k}" "${area}" "looking for"`)].filter((q,i,a)=>a.indexOf(q)===i);
 const provider="GDELT Project and/or Google News RSS";
 type Candidate={query:string,title:string,url:string,domain:string,date:string};
 const searched=await fetchNewsCandidates(queryList,{maxRecords:12,timespan:"7d"});
 if(!searched.results.length&&searched.errors.length)return json({status:"provider_error",message:"Public search providers could not be reached."},502);
 const results=searched.results.slice(0,25).map(r=>({query:r.query,title:r.title,url:r.url,snippet:"",source_domain:r.domain,date:r.date}));
 return json({status:"candidates_found",provider,business:{name:business.name,area,niche,services:serviceTerms},queries:queryList,results,count:results.length,attribution:"Data: GDELT Project (https://www.gdeltproject.org/) and/or Google News RSS; links to original publishers.",warning:"Expanded search improves coverage only; public articles are weak signals, not confirmed buyer intent. Review the article, source and relevance before saving. No contacts are scraped and no CRM leads are automatically created."});
});