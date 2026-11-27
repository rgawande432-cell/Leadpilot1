import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const xmlDecode=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const parseRss=(xml:string)=>[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m=>{const text=m[1];const field=(tag:string)=>xmlDecode((text.match(new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)<\\/"+tag+">","i"))||[])[1]||"").trim();return {title:field("title"),url:field("link"),date:field("pubDate"),description:field("description")};}).filter(x=>x.title&&x.url);
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
 if(bErr||!business||business.owner_user_id!==user.id)return json({error:"Business access denied"},403);
 const {data:source,error:sourceErr}=await client.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key","gdelt_free_news_search").maybeSingle();
 if(sourceErr)return json({status:"source_catalog_error",error:"Source permission status could not be checked; search blocked."},503);
 if(!source?.enabled||!source?.terms_reviewed)return json({status:"provider_disconnected",error:"Free news source disabled pending terms review."},403);
 const niche=business.niche||business.business_type||business.name,area=body.area||business.location||"India";
 const services=(business.services||[]).slice(0,4).join(" ")||niche;
 const query='"'+niche+'" "'+area+'"';
 let results:Array<{query:string,title:string,url:string,snippet:string,source_domain:string,date:string}>=[];
 let provider="GDELT Project";
 try{
  const endpoint=new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  endpoint.searchParams.set("query",query);endpoint.searchParams.set("mode","ArtList");endpoint.searchParams.set("format","json");endpoint.searchParams.set("maxrecords","25");endpoint.searchParams.set("timespan","7d");endpoint.searchParams.set("sort","DateDesc");
  const response=await fetch(endpoint,{headers:{"Accept":"application/json"}});
  let articles:any[]=[];
  let fallbackReason="";
  if(response.ok){
   const raw=await response.text();
   try{const data=JSON.parse(raw);if(Array.isArray(data.articles))articles=data.articles;else fallbackReason="GDELT returned HTTP 200 without article data";}
   catch{fallbackReason="GDELT returned HTTP 200 with non-JSON content";}
  }else if(response.status===429||response.status>=500)fallbackReason="GDELT HTTP "+response.status;
  else return json({status:"provider_error",provider_status:response.status,message:"GDELT search failed."},502);
  if(fallbackReason||!articles.length){
   const searchTerms=[...new Set([niche,...(business.services||[]),...(body.keywords||[])].filter(Boolean).map((t:string)=>String(t).trim()).filter((t:string)=>t.length>=3))].slice(0,4);
   const rssQueries=[...new Set([query,...searchTerms.map((t:string)=>'"'+t+'" "'+area+'"'),...searchTerms.slice(0,2).map((t:string)=>'"'+t+'" ('+'looking for OR need OR quote OR recommend'+') "'+area+'"')])].slice(0,5);
   const rssArticles:any[]=[];
   for(const rssQuery of rssQueries){
    const rssUrl=new URL("https://news.google.com/rss/search");rssUrl.searchParams.set("q",rssQuery+" when:7d");rssUrl.searchParams.set("hl","en-IN");rssUrl.searchParams.set("gl","IN");rssUrl.searchParams.set("ceid","IN:en");
    const rss=await fetch(rssUrl,{headers:{"Accept":"application/rss+xml, application/xml, text/xml"}});
    if(rss.ok)rssArticles.push(...parseRss(await rss.text()));
   }
   if(!rssArticles.length)return json({status:"provider_error",message:"Free Google News RSS returned no results."},502);
   articles=rssArticles;provider="Google News RSS fallback";
  }
  const uniqueMap=new Map<string,{title:string,url:string,domain:string,date:string,description:string}>();
  for(const item of articles){try{const u=new URL(item.url);if(!["http:","https:"].includes(u.protocol))continue;uniqueMap.set(u.href,{title:item.title||"",url:u.href,domain:item.domain||u.hostname,date:item.seendate||item.date||"",description:item.description||item.snippet||""});}catch{}}
  const unique=[...uniqueMap.values()];
  results=unique.slice(0,25).map(r=>({query,title:r.title,url:r.url,snippet:r.description||"",source_domain:r.domain,date:r.date}));
 }catch{return json({status:"provider_error",message:"Free search provider and RSS fallback connection failed."},502);}
 return json({status:"candidates_found",provider,business:{name:business.name,area,niche,services},queries:[query],results,count:results.length,attribution:"Data: GDELT Project (https://www.gdeltproject.org/) and/or Google News RSS; links to original publishers.",warning:"News results are weak signals, not confirmed buyer intent. Review the article, source and relevance before saving. No contacts are scraped and no CRM leads are automatically created."});
});