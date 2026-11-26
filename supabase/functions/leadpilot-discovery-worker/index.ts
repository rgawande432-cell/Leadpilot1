import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-leadpilot-worker-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const clean=(s:string)=>String(s||"").toLowerCase().replace(/\\s+/g," ").trim().slice(0,600);
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
 const apiKey=Deno.env.get("BRAVE_SEARCH_API_KEY");
 const {data:braveSource}=await admin.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","brave_public_web_search").maybeSingle();
 const braveApproved=!!braveSource?.enabled&&!!braveSource?.terms_reviewed;
 const claim=await admin.rpc("claim_leadpilot_discovery_jobs",{p_limit:2});
 if(claim.error)return json({error:claim.error.message},500);
 const jobs=claim.data||[],reports=[];
 for(const job of jobs){
  const start=new Date().toISOString();
  let runId:string|null=null;
  try{
   const [{data:biz,error:bErr},{data:cfg,error:cErr}]=await Promise.all([
    admin.from("businesses").select("id,name,business_type,niche,description,location,services,audience").eq("id",job.business_id).single(),
    admin.from("ai_discovery_configs").select("*").eq("business_id",job.business_id).eq("status","active").single()
   ]);
   if(bErr||!biz||cErr||!cfg)throw new Error("Business or active discovery configuration missing");
   const inserted=await admin.from("ai_discovery_runs").insert({business_id:biz.id,config_id:cfg.id,status:"running",started_at:start,source_name:apiKey?"Scheduled Brave search":"Scheduled internal check"}).select("id").single();
   if(inserted.error)throw inserted.error;
   runId=inserted.data.id;
   const [{count:leadCount},{count:verifiedCount}]=await Promise.all([
    admin.from("leads").select("id",{count:"exact",head:true}).eq("business_id",biz.id),
    admin.from("ai_discovery_signals").select("id",{count:"exact",head:true}).eq("business_id",biz.id).eq("verification_status","verified")
   ]);
   const category=biz.niche||biz.business_type||biz.name;
   const area=cfg.area||biz.location||"India";
   const serviceWords=(biz.services||[]).slice(0,3).join(" ")||category;
   const keywords=(cfg.keywords||[]).slice(0,3).map((k:string)=>String(k));
   const queries=[`"${category}" looking for ${area}`,`need ${serviceWords} near ${area}`,`"${category}" quote request ${area}`,...keywords.map((k:string)=>k+" "+area+" enquiry")].slice(0,3);
   let savedCount=0,externalStatus=apiKey?(braveApproved?"connected":"source_disabled"):"disconnected",errorText=apiKey&&!braveApproved?"Brave source is disabled or terms review is incomplete. Enable it only after owner approval.":"";
   if(apiKey&&braveApproved){
    try{
     const gathered=[];
     for(const q of queries){
      const endpoint=new URL("https://api.search.brave.com/res/v1/web/search");
      endpoint.searchParams.set("q",q);endpoint.searchParams.set("country","IN");endpoint.searchParams.set("search_lang","en");endpoint.searchParams.set("count","5");endpoint.searchParams.set("freshness","pm");
      const response=await fetch(endpoint,{headers:{"Accept":"application/json","X-Subscription-Token":apiKey}});
      if(!response.ok)throw new Error("Brave API HTTP "+response.status);
      const data=await response.json();
      for(const item of data.web?.results||[]){
       try{const u=new URL(item.url);if(!["http:","https:"].includes(u.protocol))continue;gathered.push({title:item.title||"",url:u.href,snippet:item.description||""});}catch{}
      }
     }
     const unique=[...new Map(gathered.map(x=>[x.url,x])).values()];
     const terms=[biz.niche,biz.business_type,...(biz.services||[]),...(cfg.keywords||[])].filter(Boolean).flatMap((t:string)=>String(t).toLowerCase().split(/[^a-z0-9]+/)).filter((t:string)=>t.length>=3);
     for(const result of unique.slice(0,15)){
      const evidence=(result.title+" — "+result.snippet).slice(0,1800),txt=clean(evidence);
      const intent=/(looking for|need a|need an|want to buy|buying|purchase|hire|quote|quotation|price for|available for|request for|seeking)/i.test(txt)?"explicit":/(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides)/i.test(txt)?"question":"research";
      if(intent==="research")continue;
      const matches=[...new Set(terms)].filter((t:string)=>txt.includes(t));
      if(matches.length===0)continue;
      const score=Math.min(90,(intent==="explicit"?58:42)+Math.min(24,matches.length*8));
      const payload={business_id:biz.id,run_id:runId,source_name:"Brave Search (scheduled)",source_url:result.url,evidence,intent_type:intent,signal_date:new Date().toISOString().slice(0,10),score,verification_status:"pending",dedupe_key:clean(result.url+"|"+result.snippet).slice(0,500)};
      const saved=await admin.from("ai_discovery_signals").upsert(payload,{onConflict:"business_id,dedupe_key"}).select("id").single();
      if(!saved.error)savedCount++;
     }
    }catch(e){externalStatus="error";errorText=e instanceof Error?e.message:String(e);}
   }
   const completed=new Date().toISOString();
   const report={business_name:biz.name,existing_real_enquiries:leadCount||0,verified_intent_signals:verifiedCount||0,pending_search_candidates:savedCount,external_search_status:externalStatus,external_search_error:errorText,queries:apiKey?queries:[],note:apiKey?"Public search results filtered by evidence and business relevance; all saved as pending signals, not leads.":"No search key configured; internal account counts only, no fabricated records."};
   await admin.from("ai_discovery_runs").update({status:externalStatus==="error"?"failed":"completed",completed_at:completed,signals_found:savedCount,leads_created:0,source_name:apiKey?"Scheduled Brave search":"Scheduled internal check",error_summary:errorText||report.note}).eq("id",runId);
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