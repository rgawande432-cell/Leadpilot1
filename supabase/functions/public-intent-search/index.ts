import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { parseGoogleNewsRss } from "../_shared/google-news-rss.js";
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
 const niche=business.niche||business.business_type||business.name,area=body.area||business.location||"India";
 const serviceTerms=(business.services||[]).filter(Boolean).slice(0,4).join(" ")||niche;
 const queryList=[`"${niche}" "${area}"`,`"${serviceTerms}" "${area}"`,`"${niche}" "${area}" "looking for"`].filter((q,i,a)=>a.indexOf(q)===i);
 const provider="GDELT Project + Google News RSS fallback";
 type Candidate={query:string,title:string,url:string,domain:string,date:string};
 const all:Candidate[]=[];
 try{
  const queryResults=await Promise.all(queryList.map(async(query):Promise<Candidate[]>=>{
   let articles:any[]=[];let fallback=false;
   const endpoint=new URL("https://api.gdeltproject.org/api/v2/doc/doc");
   endpoint.searchParams.set("query",query);endpoint.searchParams.set("mode","ArtList");endpoint.searchParams.set("format","json");endpoint.searchParams.set("maxrecords","12");endpoint.searchParams.set("timespan","7d");endpoint.searchParams.set("sort","DateDesc");
   try{
    const response=await fetch(endpoint,{headers:{"Accept":"application/json"}});
    if(response.ok){const raw=await response.text();try{const data=JSON.parse(raw);articles=Array.isArray(data.articles)?data.articles:[];fallback=!articles.length;}catch{fallback=true;}}
    else fallback=response.status===429||response.status>=500;
   }catch{fallback=true;}
   if(fallback||!articles.length){
    const rssUrl=new URL("https://news.google.com/rss/search");rssUrl.searchParams.set("q",query+" when:7d");rssUrl.searchParams.set("hl","en-IN");rssUrl.searchParams.set("gl","IN");rssUrl.searchParams.set("ceid","IN:en");
    try{const rss=await fetch(rssUrl,{headers:{"Accept":"application/rss+xml, application/xml, text/xml"}});if(rss.ok)articles=parseGoogleNewsRss(await rss.text());}catch{}
   }
   return articles.map(item=>{try{const u=new URL(item.url||item.link);if(!["http:","https:"].includes(u.protocol))return null;return {query,title:String(item.title||""),url:u.href,domain:item.domain||u.hostname,date:item.seendate||item.date||""};}catch{return null;}}).filter((x):x is Candidate=>Boolean(x));
  }));
  queryResults.flat().forEach(r=>all.push(r));
 }catch{return json({status:"provider_error",message:"Public search providers could not be reached."},502);}
 const dedup=new Map<string,Candidate>();
 for(const item of all)if(!dedup.has(item.url))dedup.set(item.url,item);
 const results=[...dedup.values()].slice(0,25).map(r=>({query:r.query,title:r.title,url:r.url,snippet:"",source_domain:r.domain,date:r.date}));
 return json({status:"candidates_found",provider,business:{name:business.name,area,niche,services:serviceTerms},queries:queryList,results,count:results.length,attribution:"Data: GDELT Project (https://www.gdeltproject.org/) and/or Google News RSS; links to original publishers.",warning:"Expanded search improves coverage only; public articles are weak signals, not confirmed buyer intent. Review the article, source and relevance before saving. No contacts are scraped and no CRM leads are automatically created."});
});