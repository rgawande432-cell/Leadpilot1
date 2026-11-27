import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { saveDiscoveryCandidates, recordDiscoverySourceHealth } from "../_shared/discovery-candidate-processing.js";
import { fetchNewsCandidates } from "../_shared/news-search-provider.js";
import { buildLocalIntentQueries } from "../_shared/local-intent-queries.js";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-leadpilot-worker-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const clean=(s:string)=>String(s||"").toLowerCase().replace(/\s+/g," ").trim().slice(0,600);

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json({error:"Worker environment missing"},500);
 const token=req.headers.get("x-leadpilot-worker-token")||"";
 if(token.length<32)return json({error:"Unauthorized"},401);
 const admin=createClient(url,service);
 const auth=await admin.rpc("verify_leadpilot_discovery_worker_token",{p_token:token});
 if(auth.error||auth.data!==true)return json({error:"Unauthorized"},401);
 const {data:source}=await admin.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","gdelt_free_news_search").maybeSingle();
 const approved=!!source?.enabled&&!!source?.terms_reviewed;
 const claim=await admin.rpc("claim_leadpilot_discovery_jobs",{p_limit:1});
 if(claim.error)return json({error:claim.error.message},500);
 const jobs=claim.data||[],reports=[];
 for(const job of jobs){
  const start=new Date().toISOString();let runId:string|null=null;
  try{
   const [{data:biz,error:bErr},{data:cfg,error:cErr}]=await Promise.all([
    admin.from("businesses").select("id,name,business_type,niche,description,location,services,audience").eq("id",job.business_id).single(),
    admin.from("ai_discovery_configs").select("*").eq("business_id",job.business_id).eq("status","active").single()
   ]);
   if(bErr||!biz||cErr||!cfg)throw new Error("Business or active discovery configuration missing");
   const inserted=await admin.from("ai_discovery_runs").insert({business_id:biz.id,config_id:cfg.id,status:"running",started_at:start,source_name:approved?"Scheduled free news search":"Scheduled internal check"}).select("id").single();
   if(inserted.error)throw inserted.error;runId=inserted.data.id;
   const [{count:leadCount},{count:verifiedCount}]=await Promise.all([
    admin.from("leads").select("id",{count:"exact",head:true}).eq("business_id",biz.id),
    admin.from("ai_discovery_signals").select("id",{count:"exact",head:true}).eq("business_id",biz.id).eq("verification_status","verified")
   ]);
   const category=biz.niche||biz.business_type||biz.name,area=cfg.area||biz.location||"India";
   const searchQueries=buildLocalIntentQueries({niche:biz.niche,businessType:biz.business_type,businessName:biz.name,services:biz.services||[],area,keywords:cfg.keywords||[],maxQueries:8});
   const terms=[biz.niche,biz.business_type,...(biz.services||[]),...(cfg.keywords||[])].filter(Boolean).map((t:string)=>String(t).toLowerCase()).filter((t:string)=>t.length>=3);
   let savedCount=0,articles:any[]=[],provider="none",externalStatus=approved?"connected":"source_disabled",errorText=approved?"":"Free news source disabled or terms review incomplete.";
   if(approved){
    try{
     const search=await fetchNewsCandidates(searchQueries,{maxRecords:20,timespan:"7d"});
     for(const source of [{key:"gdelt_free_news_search",name:"GDELT Project",prefix:"GDELT"},{key:"google_news_rss",name:"Google News RSS",prefix:"Google News RSS"}]){
      const used=search.providers.includes(source.name),failed=search.errors.some((e:string)=>e.startsWith(source.prefix));
      await recordDiscoverySourceHealth({admin,businessId:biz.id,sourceKey:source.key,status:failed?(used?"degraded":"failed"):(used?"healthy":"no_results"),successful:used||!failed,notes:search.errors.filter((e:string)=>e.startsWith(source.prefix)).join("; ")||(!used?"No matching articles in search window":"Provider returned articles")});
     }
     articles=search.results;provider=search.providers.join(" + ")||"none";
     if(!articles.length&&search.errors.length)throw new Error(search.errors.join("; "));
     const candidates=articles.map((result:any)=>({title:String(result.title||""),url:String(result.url||""),domain:String(result.domain||""),date:String(result.date||"")}));
     savedCount=await saveDiscoveryCandidates({admin,businessId:biz.id,runId:runId as string,candidates,terms,mode:"title_explicit",sourceName:provider+" (free search)",maxCandidates:20});
    }catch(e){externalStatus="error";errorText=e instanceof Error?e.message:String(e);}
   }
   const completed=new Date().toISOString();
   const report={business_name:biz.name,existing_real_enquiries:leadCount||0,verified_intent_signals:verifiedCount||0,pending_search_candidates:savedCount,external_search_status:externalStatus,external_search_error:errorText,provider,queries:approved?searchQueries:[],note:approved?"Public news results are weak signals, not confirmed buyer intent. Data source attribution: GDELT Project and/or Google News RSS. Pending verification only.":"No external provider active; no fabricated leads or signals created."};
   await admin.from("ai_discovery_runs").update({status:externalStatus==="error"?"failed":"completed",completed_at:completed,signals_found:savedCount,leads_created:0,source_name:provider||"Scheduled internal check",error_summary:errorText||report.note}).eq("id",runId);
   await admin.from("ai_discovery_jobs").update({status:externalStatus==="error"?"failed":"completed",completed_at:completed,next_retry_at:externalStatus==="error"?new Date(Date.now()+Math.min(60,10*(job.attempts||1))*60000).toISOString():null,error_message:errorText||null,metadata:{...(job.metadata||{}),report}}).eq("id",job.id);
   reports.push({job_id:job.id,run_id:runId,report});
  }catch(e){
   const message=e instanceof Error?e.message:String(e),when=new Date().toISOString();
   if(runId)await admin.from("ai_discovery_runs").update({status:"failed",completed_at:when,error_summary:message}).eq("id",runId);
   await admin.from("ai_discovery_jobs").update({status:"failed",completed_at:when,next_retry_at:new Date(Date.now()+Math.min(60,10*(job.attempts||1))*60000).toISOString(),error_message:message}).eq("id",job.id);
   reports.push({job_id:job.id,error:message});
  }
 }
 return json({success:true,claimed:jobs.length,processed:reports});
});