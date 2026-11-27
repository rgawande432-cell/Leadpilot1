import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { fetchNewsCandidates } from "../_shared/news-search-provider.js";
import { buildLocalIntentQueries } from "../_shared/local-intent-queries.js";
import { saveDiscoveryCandidates, recordDiscoverySourceHealth } from "../_shared/discovery-candidate-processing.js";
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
 const {data:sourceCatalog,error:sourceErr}=await client.from("ai_discovery_sources").select("source_key,enabled,terms_reviewed,requires_credentials");
 if(sourceErr)return json({status:"source_catalog_error",error:"Source permission status could not be checked; search blocked."},503);
 const sourceByKey=new Map((sourceCatalog||[]).map((s:any)=>[s.source_key,s]));
 const approved=(key:string)=>{const s=sourceByKey.get(key);return !!s?.enabled&&!!s?.terms_reviewed;};
 const gdeltApproved=approved("gdelt_free_news_search");
 const rssApproved=approved("google_news_rss");
 const searxngApproved=approved("searxng_self_hosted")&&!!Deno.env.get("SEARXNG_URL");
 const tavilyApproved=approved("tavily_search")&&!!Deno.env.get("TAVILY_API_KEY");
 if(!gdeltApproved&&!rssApproved&&!searxngApproved&&!tavilyApproved)return json({status:"provider_disconnected",error:"No public search provider is enabled, terms-reviewed, and configured."},403);
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
 const niche=business.niche||business.business_type||business.name,area=body.area||business.location||"India";
 const serviceTerms=(business.services||[]).filter(Boolean).slice(0,4).join(" ")||niche;
 const queryList=buildLocalIntentQueries({niche,businessType:business.business_type,businessName:business.name,services:business.services||[],area,keywords:cfg?.keywords||[],maxQueries:8});
 const provider="GDELT Project and/or Google News RSS";
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const healthAdmin=service?createClient(url,service):client;
 const healthWarnings:string[]=[];
 type Candidate={query:string,title:string,url:string,domain:string,date:string};
 const searched=await fetchNewsCandidates(queryList,{maxRecords:12,timespan:"7d",googleNewsRssEnabled:rssApproved,searxngUrl:searxngApproved?(Deno.env.get("SEARXNG_URL")||""):"",tavilyApiKey:tavilyApproved?(Deno.env.get("TAVILY_API_KEY")||""):""});
 for(const source of [{key:"gdelt_free_news_search",name:"GDELT Project",prefix:"GDELT",approved:gdeltApproved},{key:"google_news_rss",name:"Google News RSS",prefix:"Google News RSS",approved:rssApproved},{key:"searxng_self_hosted",name:"SearXNG",prefix:"SearXNG",approved:searxngApproved},{key:"tavily_search",name:"Tavily",prefix:"Tavily",approved:tavilyApproved}]){
  const used=searched.providers.includes(source.name),succeeded=searched.providerSuccesses.includes(source.name),failed=searched.errors.some((e:string)=>e.startsWith(source.prefix));
  const status=!source.approved?"disabled":failed?(succeeded?"degraded":"failed"):(succeeded?(used?"healthy":"no_results"):"not_connected");
  const notes=!source.approved?"Provider disabled or terms review/credentials incomplete":searched.errors.filter((e:string)=>e.startsWith(source.prefix)).join("; ")||(!succeeded?"Provider was not successfully reached":(used?"Provider returned results":"Provider connected; no matching results"));
  const healthSaved=await recordDiscoverySourceHealth({admin:healthAdmin,businessId,sourceKey:source.key,status,successful:source.approved&&succeeded,notes});
  if(!healthSaved)healthWarnings.push(source.name+" health status could not be saved");
 }
 if(!searched.results.length&&searched.errors.length)return json({status:"provider_error",message:"Public search providers could not be reached."},502);
 const results=searched.results.slice(0,25).map(r=>({query:r.query,title:r.title,url:r.url,snippet:"",source_domain:r.domain,date:r.date}));
 return json({status:"candidates_found",provider,provider_health_warnings:healthWarnings,business:{name:business.name,area,niche,services:serviceTerms},queries:queryList,results,count:results.length,attribution:"Data: GDELT Project (https://www.gdeltproject.org/) and/or Google News RSS; links to original publishers.",warning:"Expanded search improves coverage only; public articles are weak signals, not confirmed buyer intent. Review the article, source and relevance before saving. No contacts are scraped and no CRM leads are automatically created."});
});