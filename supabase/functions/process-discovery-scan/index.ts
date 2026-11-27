import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { saveDiscoveryCandidates, recordDiscoverySourceHealth } from "../_shared/discovery-candidate-processing.js";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!service||!anon)return json({error:"Server configuration missing"},500);
 const auth=req.headers.get("Authorization")||"";
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:authErr}=await userClient.auth.getUser();
 if(authErr||!user)return json({error:"Sign-in required"},401);
 let body;try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const businessId=body.business_id,jobId=body.job_id;
 if(!businessId||!jobId)return json({error:"business_id and job_id required"},400);
 const admin=createClient(url,service);
 const {data:business,error:bErr}=await admin.from("businesses").select("id,name,owner_user_id,business_type,niche,description,location,services,audience").eq("id",businessId).single();
 if(bErr||business.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const {data:job,error:jErr}=await admin.from("ai_discovery_jobs").select("*").eq("id",jobId).eq("business_id",businessId).single();
 if(jErr||!job)return json({error:"Scan job not found"},404);
 const {data:cfg}=await admin.from("ai_discovery_configs").select("*").eq("business_id",businessId).single();
 if(!cfg||cfg.status!=="active")return json({error:"AI discovery is paused or not configured"},409);
 const now=new Date().toISOString();
 await admin.from("ai_discovery_jobs").update({status:"running",started_at:now,attempts:(job.attempts||0)+1}).eq("id",jobId);
 const {data:run,error:runErr}=await admin.from("ai_discovery_runs").insert({business_id:businessId,config_id:cfg.id,status:"running",started_at:now,source_name:"Connected source scan"}).select().single();
 if(runErr){await admin.from("ai_discovery_jobs").update({status:"failed",error_message:runErr.message,completed_at:now}).eq("id",jobId);return json({error:runErr.message},500);}
 const [{count:leadCount},{count:signalCount},{data:enabledSources}]=await Promise.all([
 admin.from("leads").select("*",{count:"exact",head:true}).eq("business_id",businessId),
 admin.from("ai_discovery_signals").select("*",{count:"exact",head:true}).eq("business_id",businessId).eq("verification_status","verified"),
 admin.from("ai_discovery_sources").select("source_key,display_name,source_type,enabled,requires_credentials,terms_reviewed").eq("enabled",true)
 ]);
 const available=(enabledSources||[]).filter(s=>s.source_type==="business_owned"||s.source_type==="manual_review");
 const apiKey=Deno.env.get("BRAVE_SEARCH_API_KEY");
 const {data:braveSource}=await admin.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","brave_public_web_search").maybeSingle();
 const braveApproved=!!braveSource?.enabled&&!!braveSource?.terms_reviewed;
 let candidates=0,externalStatus=apiKey?(braveApproved?"connected":"source_disabled"):"disconnected",externalError=apiKey&&!braveApproved?"Brave source is disabled or terms review is incomplete.":"",searchQueries:string[]=[];
 if(!apiKey||!braveApproved)await recordDiscoverySourceHealth({admin,businessId,sourceKey:"brave_public_web_search",status:"disabled",successful:false,notes:!apiKey?"Brave API key not configured":"Brave source disabled or terms not reviewed"});
 if(apiKey&&braveApproved){
  const niche=business.niche||business.business_type||business.name,area=cfg.area||business.location||"India",services=(business.services||[]).slice(0,4).join(" ")||niche;
  searchQueries=[`"${niche}" "looking for" "${area}"`,`"${services}" "need" "${area}"`,`"${niche}" "recommend" "${area}"`,`"${niche}" "quotation" "${area}"`,`"${niche}" "where can I buy" "${area}`,...(cfg.keywords||[]).filter(Boolean).slice(0,1).map((keyword:string)=>`"${keyword}" "${area}" "looking for"`)].slice(0,6);
  const results=[];let successfulRequests=0;
  try{
   for(const q of searchQueries){
    const endpoint=new URL("https://api.search.brave.com/res/v1/web/search");endpoint.searchParams.set("q",q);endpoint.searchParams.set("country","IN");endpoint.searchParams.set("search_lang","en");endpoint.searchParams.set("count","8");endpoint.searchParams.set("freshness","pw");endpoint.searchParams.set("result_filter","web");
    const response=await fetch(endpoint,{headers:{"Accept":"application/json","X-Subscription-Token":apiKey}});
    if(!response.ok)throw new Error("Brave search HTTP "+response.status);
    successfulRequests++;const data=await response.json();for(const item of (data.web?.results||[])){try{const parsed=new URL(item.url);if(!["http:","https:"].includes(parsed.protocol))continue;results.push({query:q,title:item.title||"",url:parsed.href,snippet:item.description||""});}catch{continue;}}
   }
   const terms=[business.niche,business.business_type,...(business.services||[]),...(cfg.keywords||[])].filter(Boolean);
   candidates=await saveDiscoveryCandidates({admin,businessId,runId:run.id,candidates:results,terms,mode:"text_intent",sourceName:"Brave Search",maxCandidates:25});
   externalStatus="connected";
   await recordDiscoverySourceHealth({admin,businessId,sourceKey:"brave_public_web_search",status:results.length?"healthy":"no_results",successful:successfulRequests>0,notes:results.length?"Brave Search returned public candidates":"Brave Search connected but no matching results"});
  }catch(e){externalStatus="error";externalError=e instanceof Error?e.message:String(e);await recordDiscoverySourceHealth({admin,businessId,sourceKey:"brave_public_web_search",status:"failed",successful:false,notes:externalError});}
 }
 const completed=new Date().toISOString();
 const report={existing_real_enquiries:leadCount||0,verified_intent_signals:signalCount||0,pending_search_candidates:candidates,available_source_types:available.map(s=>s.display_name),external_search_status:externalStatus,external_search_error:externalError,queries:searchQueries,note:apiKey?"External public search candidates saved as pending review only. No leads were auto-created or contact data scraped.":"External search is disconnected (API key missing). This run checked connected internal sources only; no fake leads created."};
 await admin.from("ai_discovery_runs").update({status:"completed",completed_at:completed,signals_found:candidates,leads_created:0,source_name:apiKey?"Brave public search + internal sources":"Available internal sources",error_summary:externalError||report.note}).eq("id",run.id);
 await admin.from("ai_discovery_jobs").update({status:"completed",completed_at:completed,metadata:{...(job.metadata||{}),report}}).eq("id",jobId);
 return json({success:true,run_id:run.id,job_id:jobId,report});
});