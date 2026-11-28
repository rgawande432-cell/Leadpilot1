import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-leadpilot-worker-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const norm = (v:unknown)=>String(v||"").toLowerCase().replace(/\s+/g," ").trim().slice(0,1000);
const timeoutFetch = async (url:URL,headers:Record<string,string>,ms=10000) => {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{headers,signal:controller.signal});}finally{clearTimeout(timer);}
};
const xmlDecode=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const parseRss=(xml:string,provider:string)=>[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m=>{
 const block=m[1];const field=(tag:string)=>xmlDecode((block.match(new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)<\\/"+tag+">","i"))||[])[1]||"").trim();
 return {title:field("title"),url:field("link"),date:field("pubDate"),description:field("description"),domain:provider};
}).filter(x=>x.title&&x.url);
function classify(text:string,terms:string[],area:string){
 const t=norm(text);const matched=terms.filter(x=>x&&t.includes(x)).slice(0,8);
 const explicit=/(looking for|need a|need an|need to|want to buy|want a|buying|purchase|hire|quote|quotation|price for|available for|request for|seeking|chahiye|kharidna|kharid|mangwana|mujhe.*(chahiye|buy)|खरीद|चाहिए)/i.test(t);
 const question=/(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides|kahan milega|कहाँ|कौन|किससे|recommendation)/i.test(t);
 const areaMatch=area&&t.includes(norm(area));
 const intent=explicit?"explicit":question?"question":"research";
 const score=Math.min(100,(explicit?42:question?30:10)+Math.min(28,matched.length*7)+(areaMatch?12:0)+(t.length>80?5:0));
 return {intent,score,matched,areaMatch};
}
function buildQueries(category:string,area:string,terms:string[]){
 const main=terms.slice(0,3);
 const queries=[
  '"' + category + '" "' + area + '"',
  '(' + main.slice(0,2).map(t=>'"'+t+'"').join(" OR ") + ') "' + area + '" (looking for OR need OR recommend OR quote OR price)',
  '(' + main.slice(0,2).map(t=>'"'+t+'"').join(" OR ") + ') "' + area + '" (chahiye OR kahan OR kharid OR recommendation)'
 ];
 return [...new Set(queries.map(q=>q.replace(/\s+/g," ").trim()).filter(Boolean))].slice(0,3);
}
async function searchGdelt(query:string){
 const u=new URL("https://api.gdeltproject.org/api/v2/doc/doc");u.searchParams.set("query",query);u.searchParams.set("mode","ArtList");u.searchParams.set("format","json");u.searchParams.set("maxrecords","15");u.searchParams.set("timespan","7d");u.searchParams.set("sort","DateDesc");
 const r=await timeoutFetch(u,{"Accept":"application/json"});if(!r.ok)throw new Error("GDELT HTTP "+r.status);
 const raw=await r.text();let data:any;try{data=JSON.parse(raw);}catch{throw new Error("GDELT response was not JSON");}
 if(!Array.isArray(data?.articles))throw new Error("GDELT returned no article list");
 return data.articles.map((a:any)=>({title:a.title||"",url:a.url||"",date:a.seendate||"",description:a.description||"",domain:a.domain||"GDELT"})).filter((a:any)=>a.title&&a.url);
}
async function searchRss(query:string,provider:"Google News RSS"|"Bing News RSS"){
 const u=provider==="Google News RSS"?new URL("https://news.google.com/rss/search"):new URL("https://www.bing.com/news/search");
 if(provider==="Google News RSS"){u.searchParams.set("q",query+" when:14d");u.searchParams.set("hl","en-IN");u.searchParams.set("gl","IN");u.searchParams.set("ceid","IN:en");}
 else {u.searchParams.set("q",query);u.searchParams.set("format","rss");u.searchParams.set("setlang","en-IN");}
 const r=await timeoutFetch(u,{"Accept":"application/rss+xml, application/xml, text/xml"});if(!r.ok)throw new Error(provider+" HTTP "+r.status);
 return parseRss(await r.text(),provider);
}
async function aiAnalyze(items:any[],business:any,area:string){
 const key=Deno.env.get("OPENAI_API_KEY");if(!key||!items.length)return null;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
 try{
  const payload=items.slice(0,12).map((x,i)=>({id:i,title:x.title,description:x.description||"",domain:x.domain||"",url:x.url}));
  const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({model:"gpt-4o-mini",temperature:0.1,response_format:{type:"json_object"},messages:[{role:"system",content:"You classify public web/news evidence for a local business lead-discovery system. Never infer or invent a person's identity, contact details, purchase, or private data. News articles are not confirmed leads. Return JSON only: {items:[{id,relevance_score 0-100,intent_type explicit|question|research,summary,reason}]}. Score relevance to the supplied business and locality. Only classify explicit/question when article text genuinely expresses a request, recommendation question, price/quote intent, buying need, or service need. Otherwise research. Summaries must be grounded in supplied text."},{role:"user",content:JSON.stringify({business:{name:business.name,type:business.business_type,niche:business.niche,services:business.services},area,results:payload})}]})});
  if(!response.ok)return null;const body=await response.json();const text=body?.choices?.[0]?.message?.content;if(!text)return null;const parsed=JSON.parse(text);return Array.isArray(parsed.items)?parsed.items:null;
 }catch{return null;}finally{clearTimeout(timer);}
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json({error:"Worker environment missing"},500);
 const token=req.headers.get("x-leadpilot-worker-token")||"";if(token.length<32)return json({error:"Unauthorized"},401);
 const admin=createClient(url,service);
 const auth=await admin.rpc("verify_leadpilot_discovery_worker_token",{p_token:token});if(auth.error||auth.data!==true)return json({error:"Unauthorized"},401);
 const {data:source}=await admin.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","gdelt_free_news_search").maybeSingle();
 const approved=!!source?.enabled&&!!source?.terms_reviewed;
 const claim=await admin.rpc("claim_leadpilot_discovery_jobs",{p_limit:2});if(claim.error)return json({error:claim.error.message},500);
 const jobs=claim.data||[],reports:any[]=[];
 for(const job of jobs){
  const started=new Date().toISOString();let runId:string|null=null;
  try{
   const [{data:biz,error:bErr},{data:cfg,error:cErr}]=await Promise.all([
    admin.from("businesses").select("id,name,business_type,niche,description,location,services,audience").eq("id",job.business_id).single(),
    admin.from("ai_discovery_configs").select("*").eq("business_id",job.business_id).eq("status","active").single()
   ]);
   if(bErr||!biz||cErr||!cfg)throw new Error("Business or active discovery configuration missing");
   const run=await admin.from("ai_discovery_runs").insert({business_id:biz.id,config_id:cfg.id,status:"running",started_at:started,source_name:approved?"Scheduled automatic multi-source discovery":"Scheduled internal check"}).select("id").single();
   if(run.error)throw run.error;runId=run.data.id;
   const category=biz.niche||biz.business_type||biz.name,area=cfg.area||biz.location||"India";
   const rawTerms=[biz.niche,biz.business_type,...(biz.services||[]),...(cfg.keywords||[])].filter(Boolean).map((t:string)=>String(t).trim().toLowerCase()).filter((t:string)=>t.length>=3);
   const terms=[...new Set(rawTerms)];
   const queries=buildQueries(category,area,terms.length?terms:[category]);
   let all:any[]=[],providerErrors:string[]=[];
   if(approved){
    const gdelt=await Promise.allSettled(queries.map(q=>searchGdelt(q)));
    for(const result of gdelt){if(result.status==="fulfilled")all.push(...result.value);else providerErrors.push(String(result.reason?.message||result.reason));}
    const rssTasks=queries.flatMap(q=>[searchRss(q,"Google News RSS"),searchRss(q,"Bing News RSS")]);
    const rss=await Promise.allSettled(rssTasks);
    for(const result of rss){if(result.status==="fulfilled")all.push(...result.value);else providerErrors.push(String(result.reason?.message||result.reason));}
   }
   const unique=new Map<string,any>();
   for(const item of all){try{const u=new URL(item.url);if(!["http:","https:"].includes(u.protocol))continue;const key=u.href;const prev=unique.get(key);if(!prev||String(item.description||"").length>String(prev.description||"").length)unique.set(key,{...item,url:key});}catch{}}
   const candidates=[...unique.values()].slice(0,60);
   const ai=approved?await aiAnalyze(candidates,biz,area):null;
   let savedCount=0,explicitCount=0,questionCount=0,newCount=0;
   for(let i=0;i<candidates.length;i++){
    const item=candidates[i],evidence=(item.title+" — "+(item.description||"")+" — "+item.domain+" — "+item.date).slice(0,2000),heur=classify(evidence,terms,area),aiItem=ai?.find((x:any)=>Number(x.id)===i);
    const intent=aiItem?.intent_type==="explicit"||aiItem?.intent_type==="question"||aiItem?.intent_type==="research"?aiItem.intent_type:heur.intent;
    const relevance=Number.isFinite(Number(aiItem?.relevance_score))?Math.max(0,Math.min(100,Number(aiItem.relevance_score))):heur.score;
    const score=Math.round(Math.max(0,Math.min(100,relevance+(heur.areaMatch?5:0))));
    const matched=heur.matched;
    if(intent==="research"||score<40||matched.length===0)continue;
    const summary=String(aiItem?.summary||item.title||"Public web intent signal").slice(0,500);
    const reason=String(aiItem?.reason||("Matched terms: "+matched.join(", "))).slice(0,400);
    const dedupe=norm(item.url+"|"+item.title).slice(0,500);
    const existing=await admin.from("ai_discovery_signals").select("id,verification_status").eq("business_id",biz.id).eq("dedupe_key",dedupe).maybeSingle();
    const payload={business_id:biz.id,run_id:runId,source_name:(item.domain||"Public search")+" (automatic discovery)",source_url:item.url,evidence:(summary+" — "+reason+" — "+evidence).slice(0,2000),intent_type:intent,signal_date:new Date().toISOString().slice(0,10),score,verification_status:existing.data?.verification_status||"pending",dedupe_key:dedupe};
    const saved=await admin.from("ai_discovery_signals").upsert(payload,{onConflict:"business_id,dedupe_key"}).select("id").single();
    if(saved.error)continue;savedCount++;if(!existing.data)newCount++;
    if(intent==="explicit")explicitCount++;else if(intent==="question")questionCount++;
   }
   const now=new Date().toISOString();
   const note=approved?"Scheduled discovery completed. Public results are unverified intent signals, not confirmed buyer enquiries. AI classifier "+(ai?"used":"not available; rules-based scoring used")+".":"No approved external source is enabled; no leads fabricated.";
   const report={business_name:biz.name,area,niche:category,queries,provider:"GDELT + Google News RSS + Bing News RSS",candidate_articles:candidates.length,pending_search_candidates:savedCount,new_candidates:newCount,explicit_intent_candidates:explicitCount,question_candidates:questionCount,ai_classification:ai?"active":"fallback_rules",external_search_status:approved?"connected":"source_disabled",external_search_errors:providerErrors.slice(0,8),note};
   await admin.from("ai_discovery_runs").update({status:"completed",completed_at:now,signals_found:newCount,leads_created:0,source_name:"Automatic multi-source discovery",error_summary:note}).eq("id",runId);
   await admin.from("ai_discovery_jobs").update({status:"completed",completed_at:now,next_retry_at:null,error_message:null,metadata:{...(job.metadata||{}),report}}).eq("id",job.id);
   reports.push({job_id:job.id,run_id:runId,report});
  }catch(e){
   const message=e instanceof Error?e.message:String(e),now=new Date().toISOString();
   if(runId)await admin.from("ai_discovery_runs").update({status:"failed",completed_at:now,error_summary:message}).eq("id",runId);
   await admin.from("ai_discovery_jobs").update({status:"failed",completed_at:now,next_retry_at:new Date(Date.now()+Math.min(60,10*(job.attempts||1))*60000).toISOString(),error_message:message}).eq("id",job.id);
   reports.push({job_id:job.id,error:message});
  }
 }
 return json({success:true,claimed:jobs.length,processed:reports,worker_version:"automatic-discovery-v2"});
});