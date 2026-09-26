import urllib.request
import urllib.parse
import json

def get_category_files(category):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:{urllib.parse.quote(category)}&gcmnamespace=6&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json"
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
                        'mime': mime,
                        'artist': info.get('extmetadata', {}).get('Artist', {}).get('value', 'Unknown'),
                        'license': info.get('extmetadata', {}).get('LicenseShortName', {}).get('value', 'Unknown')
                    })
            return results
    except Exception as e:
        print(f"Error {category}: {e}")
        return []

cats = [
    'Rain_sounds', 'Thunder_sounds', 'Sea_sounds', 'Fire_sounds',
    'Water_sounds', 'Train_sounds', 'Ambient_sounds', 'Sounds_of_birds',
    'Cricket_sounds', 'Natural_sounds', 'Sound_effects'
]

for cat in cats:
    print(f"=== Category: {cat} ===")
    files = get_category_files(cat)
    for f in files[:5]:
        print(f"  - {f['title']} [{f['license']}]: {f['url']}")
