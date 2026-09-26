import urllib.request
import urllib.parse
import json
import os
import subprocess

def search_commons_audio(query):
    search_q = query + " (ogg OR wav OR mp3)"
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(search_q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0 (contact@pageos.app)'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
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
                        'license': info.get('extmetadata', {}).get('LicenseShortName', {}).get('value', 'Unknown')
                    })
            return results
    except Exception as e:
        print(f"Error {query}: {e}")
        return []

queries = [
    ("Rain Window", "rain on window glass"),
    ("Thunder", "thunder rain storm"),
    ("Ocean Waves", "ocean waves breaking beach surf"),
    ("Fireplace", "wood fire crackling hearth"),
    ("Fire", "campfire burning crackle"),
    ("Crickets", "crickets chirping night summer"),
    ("Stream", "mountain stream flowing water brook"),
    ("Cafe", "cafe restaurant ambience chatter"),
    ("Train", "train carriage interior passenger railway"),
    ("Library", "library room tone silence ambience")
]

for label, q in queries:
    hits = search_commons_audio(q)
    print(f"\n=== {label} ({q}) ===")
    for h in hits[:5]:
        print(f"  * {h['title']} [{h['license']}] ({h['size']} bytes)")
        print(f"    URL: {h['url']}")
