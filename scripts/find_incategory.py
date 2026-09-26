import urllib.request
import urllib.parse
import json

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
                    'license': info.get('extmetadata', {}).get('LicenseShortName', {}).get('value', 'Unknown'),
                    'artist': info.get('extmetadata', {}).get('Artist', {}).get('value', 'Unknown')
                }
    except Exception:
        return None

def search_files(term):
    q = f"{term} incategory:Audio_files -pronunciation -spoken"
    url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q)}&srnamespace=6&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            return [x['title'] for x in data.get('query', {}).get('search', [])]
    except Exception:
        return []

terms = [
    'gentle rain', 'rain window', 'thunderstorm', 'forest birds', 'crickets night',
    'ocean waves', 'stream water', 'wood fire crackle', 'campfire', 'coffee shop chatter',
    'train ride interior', 'room tone ambience'
]

for t in terms:
    titles = search_files(t)
    print(f"\n=== {t} ===")
    for title in titles[:4]:
        info = get_file_info(title)
        if info and info['url']:
            print(f"  * {info['title']} [{info['license']}] ({info['size']}B)")
            print(f"    {info['url']}")
