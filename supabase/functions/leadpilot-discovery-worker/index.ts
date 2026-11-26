import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-leadpilot-worker-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const clean=(s:string)=>String(s||"").toLowerCase().replace(/\s+/g," ").trim().slice(0,600);
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
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
   const inserted=await admin.from("ai_discovery_runs").insert({business_id:biz.id,config_id:cfg.id,status:"running",started_at:start,source_name:approved?"Scheduled GDELT free search":"Scheduled internal check"}).select("id").single();
   if(inserted.error)throw inserted.error;runId=inserted.data.id;
   const [{count:leadCount},{count:verifiedCount}]=await Promise.all([
    admin.from("leads").select("id",{count:"exact",head:true}).eq("business_id",biz.id),
    admin.from("ai_discovery_signals").select("id",{count:"exact",head:true}).eq("business_id",biz.id).eq("verification_status","verified")
   ]);
   const category=biz.niche||biz.business_type||biz.name,area=cfg.area||biz.location||"India";
   const services=(biz.services||[]).slice(0,3).join(" ")||category;
   const keywords=(cfg.keywords||[]).slice(0,2).map((k:string)=>String(k));
   const query='"'+category+'" "'+area+'"';
   let savedCount=0,externalStatus=approved?"connected":"source_disabled",errorText=approved?"":"GDELT source disabled or terms review incomplete.";
   if(approved){
    try{
     const endpoint=new URL("https://api.gdeltproject.org/api/v2/doc/doc");
     endpoint.searchParams.set("query",query);endpoint.searchParams.set("mode","ArtList");endpoint.searchParams.set("format","json");endpoint.searchParams.set("maxrecords","20");endpoint.searchParams.set("timespan","7d");endpoint.searchParams.set("sort","DateDesc");
     let response:Response|null=null;
     for(let attempt=0;attempt<3;attempt++){
      response=await fetch(endpoint,{headers:{"Accept":"application/json"}});
      if(response.status!==429&&response.status<500)break;
      if(attempt<2)await pause(15000*(attempt+1));
     }
     if(!response||!response.ok)throw new Error("GDELT HTTP "+(response?.status||"unknown")+" after retries");
     const data=await response.json();if(!Array.isArray(data.articles))throw new Error("GDELT response format unexpected");
     const articles=data.articles||[];
     const terms=[biz.niche,biz.business_type,...(biz.services||[]),...(cfg.keywords||[])].filter(Boolean).map((t:string)=>String(t).toLowerCase()).filter((t:string)=>t.length>=3);
     const unique=[...new Map(articles.map((item:any)=>{try{const u=new URL(item.url);return [u.href,{title:item.title||"",url:u.href,domain:item.domain||u.hostname,date:item.seendate||""}]}catch{return ["",{title:"",url:"",domain:"",date:""}]}})).values()].filter(x=>x.url);
     for(const result of unique.slice(0,20)){
      const evidence=(result.title+" — "+result.domain+" — "+result.date).slice(0,1800),txt=clean(evidence);
      const intent=/(looking for|need a|need an|want to buy|buying|purchase|hire|quote|quotation|price for|available for|request for|seeking)/i.test(txt)?"explicit":/(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides)/i.test(txt)?"question":"research";
      if(intent==="research")continue;
      const matches=[...new Set(terms)].filter((t:string)=>txt.includes(t));
      if(matches.length===0)continue;
      const score=Math.min(60,(intent==="explicit"?38:28)+Math.min(16,matches.length*5));
      const payload={business_id:biz.id,run_id:runId,source_name:"GDELT Project (free public news)",source_url:result.url,evidence,intent_type:intent,signal_date:new Date().toISOString().slice(0,10),score,verification_status:"pending",dedupe_key:clean(result.url+"|"+result.title).slice(0,500)};
      const saved=await admin.from("ai_discovery_signals").upsert(payload,{onConflict:"business_id,dedupe_key"}).select("id").single();
      if(!saved.error)savedCount++;
     }
    }catch(e){externalStatus="error";errorText=e instanceof Error?e.message:String(e);}
   }
   const completed=new Date().toISOString();
   const report={business_name:biz.name,existing_real_enquiries:leadCount||0,verified_intent_signals:verifiedCount||0,pending_search_candidates:savedCount,external_search_status:externalStatus,external_search_error:errorText,queries:approved?[query]:[],note:approved?"GDELT public news articles are weak signals, not confirmed buyer intent. Attribution: GDELT Project (https://www.gdeltproject.org/). Pending review only.":"No external provider active; no fabricated leads or signals created."};
   await admin.from("ai_discovery_runs").update({status:externalStatus==="error"?"failed":"completed",completed_at:completed,signals_found:savedCount,leads_created:0,source_name:approved?"Scheduled GDELT free search":"Scheduled internal check",error_summary:errorText||report.note}).eq("id",runId);
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