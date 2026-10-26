const SUPABASE_URL='https://nsqhfbyxqcmdthvptuzp.supabase.co';
const KEY='sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
const DOWNLOAD_URL='https://github.com/NeithDev-tech/NeithSteamLauncher/releases/latest/download/NeithSetup.exe';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async v=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))).slice(0,40);
export default async (request,context)=>{
  try{
    const reqUrl=new URL(request.url);
    const vid=reqUrl.searchParams.get('vid')||'';
    const sid=reqUrl.searchParams.get('sid')||'';
    const visitorId=UUID.test(vid)?vid:crypto.randomUUID();
    const sessionId=UUID.test(sid)?sid:crypto.randomUUID();
    const ip=String(context?.ip||'').trim();
    const salt=String(process.env.NEITH_ANALYTICS_IP_SALT||context?.site?.id||'neith-site-analytics-v1');
    const ipHash=ip?await hash(`${salt}|${ip}`):'';
    const country=context?.geo?.country||{};
    const ua=String(request.headers.get('user-agent')||'');
    const mobile=/Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const metadata={source:'server_download_redirect',device:mobile?'mobile':'desktop'};
    if(ipHash)metadata.ip_hash=ipHash;
    if(country.name)metadata.country=String(country.name).slice(0,80);
    if(country.code)metadata.country_code=String(country.code).slice(0,2).toUpperCase();
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/neith_track_site_event`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_event_type:'launcher_download',p_visitor_id:visitorId,p_session_id:sessionId,p_page_path:'/descargar',p_metadata:metadata})});
  }catch{}
  return new Response(null,{status:302,headers:{Location:DOWNLOAD_URL,'Cache-Control':'no-store'}});
};
