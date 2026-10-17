from __future__ import annotations
import html, json, re, ssl, time, urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

GAMERPOWER='https://www.gamerpower.com/api/giveaways?type=game'
EPIC='https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=es-ES&country=ES&allowCountries=ES'
PRIME_XML='https://feed.eikowagenknecht.com/lootscraper_amazon_game.xml'
PRIME_HTML='https://feed.eikowagenknecht.com/lootscraper_amazon_game.html'
PRIME_CLAIMS='https://luna.amazon.com/claims/home?filter=Game&g=s'
CACHE={'ts':0.0,'payload':None}
CACHE_TTL=300


def _ctx():
    return ssl.create_default_context()


def _get(url, accept='application/json,text/plain,*/*', timeout=7.5):
    req=urllib.request.Request(url,headers={
        'User-Agent':'Mozilla/5.0 NeithLauncherWeb/1.0',
        'Accept':accept,'Accept-Language':'es-ES,es;q=0.9,en;q=0.7',
        'Cache-Control':'no-cache','Pragma':'no-cache','Connection':'close'})
    with urllib.request.urlopen(req,timeout=timeout,context=_ctx()) as r:
        return r.read(8_000_000)


def _clean_title(v=''):
    s=re.sub(r'\s+',' ',str(v or '')).strip()
    s=re.sub(r'^\s*Amazon(?:\s+(?:Prime|Games?|Luna|Prime\s+Gaming))?\s*\([^)]*\)\s*-\s*','',s,flags=re.I)
    s=re.sub(r'\s*\((?:Steam|Epic Games(?: Store)?|GOG|Ubisoft|Prime Gaming|PC)[^)]*\)\s*(?:Key\s*)?Giveaway\s*$','',s,flags=re.I)
    s=re.sub(r'\s*Giveaway\s*$','',s,flags=re.I)
    return s.strip()


def _parse_date(v):
    s=str(v or '').strip()
    if not s or s.upper() in {'N/A','UNKNOWN','NONE','NULL','-'}: return None
    try:
        d=datetime.fromisoformat(s.replace('Z','+00:00'))
        if d.tzinfo is None: d=d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception: pass
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S','%Y-%m-%d'):
        try: return datetime.strptime(s,fmt).replace(tzinfo=timezone.utc)
        except Exception: pass
    try:
        d=parsedate_to_datetime(s)
        if d.tzinfo is None: d=d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception: return None


def _ms(v):
    d=_parse_date(v)
    return int(d.timestamp()*1000) if d else 0


def _decode(v=''):
    return html.unescape(str(v or ''))


def _strip(v=''):
    s=re.sub(r'(?is)<(?:script|style)\b[^>]*>.*?</(?:script|style)>',' ',str(v or ''))
    s=re.sub(r'(?s)<[^>]+>',' ',s)
    return re.sub(r'\s+',' ',html.unescape(s)).strip()


def _local(tag): return str(tag or '').rsplit('}',1)[-1].lower()


def _node_text(entry,names):
    wanted={n.lower() for n in names}
    for child in entry.iter():
        if _local(child.tag) in wanted:
            text=' '.join(str(x).strip() for x in child.itertext() if str(x or '').strip()).strip()
            if text:return text
    return ''


def _price(text=''):
    clean=_strip(text)
    pats=[
        r'(?i)recommended\s+price(?:\s*\([^)]*\))?\s*:\s*([0-9]+(?:[.,][0-9]{1,2})?)',
        r'(?i)\b([0-9]+(?:[.,][0-9]{1,2})?)\s*EUR\b',
    ]
    for p in pats:
        m=re.search(p,clean)
        if m:
            try:
                x=float(m.group(1).replace(',','.'))
                if x>0:return x
            except Exception:pass
    return 0.0


def _prime_url(blob=''):
    for raw in re.findall(r'https?://[^\s<>"\']+',_decode(blob)):
        u=raw.rstrip(').,;]')
        low=u.lower()
        if 'luna.amazon.' in low or 'gaming.amazon.' in low or 'amazon.com' in low:return u
    return PRIME_CLAIMS


def _first_image(blob=''):
    for p in [r'(?is)<img\b[^>]*\bsrc=["\']([^"\']+)',r'(?is)<(?:media:)?thumbnail\b[^>]*\burl=["\']([^"\']+)']:
        m=re.search(p,str(blob or ''))
        if m:return _decode(m.group(1)).strip()
    return ''


def _prime_window(text=''):
    clean=_strip(text)
    f=re.search(r'(?i)offer\s+valid\s+from:\s*(\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?)?)',clean)
    t=re.search(r'(?i)offer\s+valid\s+to:\s*(\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?)?)',clean)
    if not t:
        t=re.search(r'(?i)(?:ends?|expires?|valid\s+until|available\s+until)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+\-Z]+)?|\d{1,2}[./-]\d{1,2}[./-]\d{4})',clean)
    return (f.group(1) if f else '',t.group(1) if t else '')


def _prime_atom(raw):
    try: root=ET.fromstring(raw)
    except Exception:return []
    entries=[n for n in root.iter() if _local(n.tag) in ('item','entry')]
    out=[]
    for entry in entries[:300]:
        raw_title=_node_text(entry,('title',))
        title=_clean_title(raw_title)
        if not title:continue
        fragments=[]
        for child in entry.iter():
            if child.text:fragments.append(child.text)
            if child.tail:fragments.append(child.tail)
            fragments += [str(v) for v in child.attrib.values() if v]
        blob=' '.join(fragments)
        desc_html=_node_text(entry,('description','summary','content','encoded'))
        content=_strip(desc_html or blob)
        if re.search(r'(?i)in[- ]game loot|skin pack|currency pack',title+' '+content):continue
        start,end=_prime_window(content)
        if not end:end=_node_text(entry,('end','enddate','endtime','expires','expiry','expiration','validuntil','offerend'))
        enddt=_parse_date(end)
        if not enddt:continue
        image=''
        for child in entry.iter():
            cand=str(child.attrib.get('url') or child.attrib.get('href') or child.attrib.get('src') or '').strip()
            mime=str(child.attrib.get('type') or '').lower()
            if cand.startswith('http') and (_local(child.tag) in ('thumbnail','image','img') or ('image' in mime)):
                image=cand;break
        if not image:image=_first_image(desc_html)
        price=_price(content)
        out.append({'title':title,'platform':'PRIME GAMING','worth':f'{price:.2f} €' if price else None,'image':image,'thumbnail':image,'endDate':end,'endAt':int(enddt.timestamp()*1000),'publishedDate':start or None,'url':_prime_url(blob),'source':'Prime Gaming Luna Feed'})
    return out


def _prime_html(raw):
    text=raw.decode('utf-8-sig','replace') if isinstance(raw,(bytes,bytearray)) else str(raw)
    starts=[m.start() for m in re.finditer(r'(?is)<h2\b',text)]
    if not starts:return []
    starts.append(len(text));out=[]
    for i in range(len(starts)-1):
        seg=text[starts[i]:starts[i+1]]
        h=re.search(r'(?is)<h2\b[^>]*>(.*?)</h2>',seg)
        if not h:continue
        spans=re.findall(r'(?is)<span\b[^>]*>(.*?)</span>',h.group(1))
        title=_clean_title(_strip(spans[0] if spans else h.group(1)))
        if not title:continue
        validity=_strip(spans[-1] if len(spans)>1 else h.group(1))
        vm=re.search(r'(?i)\bValid\s+from\s+(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?',validity)
        start=vm.group(1) if vm else ''
        end=vm.group(2) if vm and vm.group(2) else ''
        if not end:
            _,end=_prime_window(seg)
        enddt=_parse_date(end)
        if not enddt:continue
        price=_price(seg)
        out.append({'title':title,'platform':'PRIME GAMING','worth':f'{price:.2f} €' if price else None,'image':_first_image(seg),'thumbnail':_first_image(seg),'endDate':end,'endAt':int(enddt.timestamp()*1000),'publishedDate':start or None,'url':_prime_url(seg),'source':'Prime Gaming Luna Feed'})
    return out


def _merge_prime(*groups):
    now=int(time.time()*1000);d={}
    for row in [x for g in groups for x in g]:
        key=_clean_title(row.get('title')).casefold()
        if not key:continue
        cur=d.get(key,{})
        merged={**cur,**row}
        for f in ('image','thumbnail','url','worth','endDate','endAt','publishedDate'):
            if not row.get(f) and cur.get(f):merged[f]=cur[f]
        d[key]=merged
    return [x for x in d.values() if int(x.get('endAt') or 0)>now]


def _platform_label(platforms='', blob=''):
    text=f"{platforms} {blob}".lower()
    if 'indiegala' in text:return 'INDIEGALA'
    if re.search(r'\bstove\b',text):return 'STOVE'
    for needle,label in [
        ('Epic Games Store','EPIC GAMES'),('Steam','STEAM'),('GOG','GOG'),
        ('Ubisoft Connect','UBISOFT CONNECT'),('Prime Gaming','PRIME GAMING'),
        ('Itch.io','ITCH.IO'),('DRM-Free','DRM-FREE'),('Battle.net','BATTLE.NET'),
        ('EA Origin','EA APP')]:
        if needle.lower() in text:return label
    return 'PC'


def _gamerpower():
    now=int(time.time()*1000);data=json.loads(_get(GAMERPOWER).decode('utf-8-sig','replace'));out=[]
    for item in data if isinstance(data,list) else []:
        if str(item.get('status','')).lower()!='active' or str(item.get('type','')).lower()!='game':continue
        platforms=str(item.get('platforms') or '')
        if not re.search(r'\bPC\b',platforms,re.I):continue
        end=_ms(item.get('end_date'))
        if end and end<=now:continue
        blob=f"{item.get('title','')} {item.get('description','')} {item.get('instructions','')}".lower()
        if re.search(r'\b(?:dlc|demo|prologue|playtest|trial|beta|free weekend|season pass|battle pass|starter pack|skin pack|currency pack)\b|in[- ]game loot|key giveaway',blob):continue
        out.append({'id':item.get('id'),'title':_clean_title(item.get('title')),'platform':_platform_label(platforms,blob),'worth':item.get('worth') or None,'image':item.get('image') or item.get('thumbnail') or '','thumbnail':item.get('thumbnail') or item.get('image') or '','endDate':item.get('end_date'),'endAt':end or None,'publishedDate':item.get('published_date'),'url':item.get('open_giveaway_url') or item.get('gamerpower_url') or '','source':'GamerPower'})
    return out


def _epic():
    now=int(time.time()*1000);payload=json.loads(_get(EPIC).decode('utf-8-sig','replace'));els=((((payload or {}).get('data') or {}).get('Catalog') or {}).get('searchStore') or {}).get('elements') or [];out=[]
    for item in els:
        active=None
        for group in ((item.get('promotions') or {}).get('promotionalOffers') or []):
            for offer in group.get('promotionalOffers') or []:
                st=_ms(offer.get('startDate')); en=_ms(offer.get('endDate')); pct=(offer.get('discountSetting') or {}).get('discountPercentage')
                if st and en and st<=now<en and int(pct if pct is not None else -1)==0: active=offer;break
            if active:break
        if not active:continue
        price=float((((item.get('price') or {}).get('totalPrice') or {}).get('originalPrice') or 0))/100
        if price<=0:continue
        title=_clean_title(item.get('title'))
        imgs=item.get('keyImages') or []
        img=next((x.get('url') for x in imgs if re.search(r'DieselStoreFrontWide|OfferImageWide|Thumbnail',str(x.get('type') or ''),re.I) and x.get('url')), imgs[0].get('url') if imgs else '')
        slug=item.get('productSlug') or item.get('urlSlug') or ''
        out.append({'id':'epic-'+str(item.get('id') or title),'title':title,'platform':'EPIC GAMES','worth':f'{price:.2f} €','image':img or '','thumbnail':img or '','endDate':active.get('endDate'),'endAt':_ms(active.get('endDate')),'publishedDate':active.get('startDate'),'url':f'https://store.epicgames.com/es-ES/p/{slug}' if slug else 'https://store.epicgames.com/es-ES/free-games','source':'Epic Games Store official'})
    return out


def _dedupe(rows):
    now=int(time.time()*1000);seen={}
    pri=lambda x:3 if 'official' in str(x.get('source','')).lower() else 2 if 'Prime Gaming' in str(x.get('source','')) else 1
    for g in rows:
        end=int(g.get('endAt') or 0)
        if end and end<=now:continue
        key=re.sub(r'[^a-z0-9]+',' ',_clean_title(g.get('title')).lower()).strip()
        if not key:continue
        if key not in seen or pri(g)>pri(seen[key]):seen[key]=g
    return sorted(seen.values(),key=lambda x:int(x.get('endAt') or 10**20))


def get_payload(force=False):
    now=time.time()
    if not force and CACHE['payload'] and now-CACHE['ts']<CACHE_TTL:return CACHE['payload']
    results=[];sources={'gamerPower':False,'epicGames':False,'primeGaming':False};errors=[]
    for name,fn,key in [('gamerPower',_gamerpower,'gamerPower'),('epicGames',_epic,'epicGames')]:
        try:results.extend(fn());sources[key]=True
        except Exception as e:errors.append(f'{name}: {e}')
    try:
        atom=[];page=[]
        try:atom=_prime_atom(_get(PRIME_XML,'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'))
        except Exception as e:errors.append('primeAtom: '+str(e))
        try:page=_prime_html(_get(PRIME_HTML,'text/html,application/xhtml+xml,*/*'))
        except Exception as e:errors.append('primeHtml: '+str(e))
        prime=_merge_prime(atom,page)
        if atom or page:sources['primeGaming']=True
        results.extend(prime)
    except Exception as e:errors.append('prime: '+str(e))
    games=_dedupe(results)
    payload={'ok':bool(games or any(sources.values())),'updatedAt':datetime.now(timezone.utc).isoformat(),'source':'Neith local multi-store feed','sources':sources,'games':games,'errors':errors}
    CACHE.update(ts=now,payload=payload)
    return payload
