import urllib.request
import urllib.parse
import json

def search_files(term):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(term)}&srnamespace=6&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            return [x['title'] for x in data.get('query', {}).get('search', []) if any(x['title'].lower().endswith(ext) for ext in ['.ogg', '.wav', '.flac', '.mp3'])]
    except Exception:
        return []

def get_file_info(title):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for pid, page in pages.items():
                info = page.get('imageinfo', [{}])[0]
                return {
                    'title': title,
                    'url': info.get('url'),
                    'size': info.get('size'),
                    'license': info.get('extmetadata', {}).get('LicenseShortName', {}).get('value', 'Unknown')
                }
    except Exception:
        return None

queries = [
    "intitle:train .ogg",
    "intitle:railway .ogg",
    "intitle:cafe .ogg",
    "intitle:restaurant .ogg",
    "intitle:room .ogg",
    "intitle:coffee .ogg",
    "intitle:ocean .ogg",
    "intitle:waves .ogg",
    "intitle:fire .ogg",
    "intitle:fireplace .ogg",
    "intitle:birds .ogg",
    "intitle:crickets .ogg"
]

for q in queries:
    hits = search_files(q)
    print(f"\n=== {q} ===")
    for h in hits[:4]:
        info = get_file_info(h)
        if info and info['url']:
            clean_title = info['title'].encode('ascii', 'replace').decode()
            print(f"  * {clean_title} [{info['license']}]")
            print(f"    {info['url']}")
