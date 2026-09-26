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

searches = {
    "fire": "burning fire OR campfire OR hearth filetype:ogg|wav|mp3",
    "train": "train interior OR passenger train OR railway carriage filetype:ogg|wav|mp3",
    "cafe": "restaurant ambience OR coffee shop OR cafe murmur filetype:ogg|wav|mp3",
    "room": "room tone OR quiet room OR interior ambience filetype:ogg|wav|mp3"
}

for label, term in searches.items():
    hits = search_files(term)
    print(f"\n=== {label} ===")
    for h in hits[:6]:
        info = get_file_info(h)
        if info and info['url']:
            clean_title = info['title'].encode('ascii', 'replace').decode()
            print(f"  * {clean_title} [{info['license']}]")
            print(f"    {info['url']}")
