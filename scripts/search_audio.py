import urllib.request
import urllib.parse
import json

def search_audio(query):
    search_q = query + " filetype:ogg|wav|mp3|flac"
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(search_q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0 (contact@pageos.app)'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
            pages = data.get('query', {}).get('pages', {})
            results = []
            for pid, page in pages.items():
                info = page.get('imageinfo', [{}])[0]
                mime = info.get('mime', '')
                if 'audio' in mime or 'ogg' in mime or 'wav' in mime:
                    results.append({
                        'title': page.get('title'),
                        'url': info.get('url'),
                        'size': info.get('size'),
                        'mime': mime,
                        'artist': info.get('extmetadata', {}).get('Artist', {}).get('value', 'Unknown'),
                        'license': info.get('extmetadata', {}).get('LicenseShortName', {}).get('value', 'Unknown'),
                        'license_url': info.get('extmetadata', {}).get('LicenseUrl', {}).get('value', '')
                    })
            return results
    except Exception as e:
        print(f"Error: {e}")
        return []

queries = [
    'rain sound', 'rain window', 'thunder storm rain', 'forest birds', 'crickets night',
    'ocean waves sea surf', 'river stream creek water', 'campfire fireplace fire crackle',
    'cafe restaurant chatter', 'train ride interior carriage', 'room tone ambience silence',
    'library room atmosphere'
]

for q in queries:
    print(f"=== Query: {q} ===")
    hits = search_audio(q)
    for h in hits[:3]:
        print(f"  - {h['title']} | {h['license']} | {h['url']}")
