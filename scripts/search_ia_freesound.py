import urllib.request
import urllib.parse
import json

def search_ia(query):
    q = f'({query}) AND mediatype:audio AND (licenseurl:*zero* OR licenseurl:*publicdomain* OR licenseurl:*by* OR collection:freesound)'
    url = f"https://archive.org/advancedsearch.php?q={urllib.parse.quote(q)}&fl[]=identifier,title,creator,licenseurl,mediatype,downloads&sort[]=downloads+desc&rows=10&page=1&output=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get('response', {}).get('docs', [])
    except Exception as e:
        print(f"Error {query}: {e}")
        return []

def get_ia_files(identifier):
    url = f"https://archive.org/metadata/{identifier}/files"
    req = urllib.request.Request(url, headers={'User-Agent': 'PageOSAudioBot/1.0'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            files = data.get('result', [])
            audio_files = []
            for f in files:
                name = f.get('name', '')
                if name.endswith('.mp3') or name.endswith('.wav') or name.endswith('.ogg') or name.endswith('.flac'):
                    audio_files.append({
                        'name': name,
                        'format': f.get('format'),
                        'size': f.get('size'),
                        'url': f"https://archive.org/download/{identifier}/{urllib.parse.quote(name)}"
                    })
            return audio_files
    except Exception as e:
        return []

targets = [
    ("Rain", "rain OR rainfall OR shower"),
    ("Rain Window", "rain window OR rain glass"),
    ("Thunderstorm", "thunder thunderstorm storm"),
    ("Forest Birds", "forest birds woodland"),
    ("Forest Night", "crickets night evening"),
    ("Ocean Waves", "ocean waves sea surf beach"),
    ("Flowing River", "river stream creek brook water"),
    ("Fireplace", "fireplace hearth campfire crackle fire"),
    ("Cafe", "cafe coffee shop restaurant ambience"),
    ("Library", "library room tone silence quiet"),
    ("Train", "train ride interior railway carriage")
]

for label, query in targets:
    docs = search_ia(query)
    print(f"\n=== {label} ({query}) ===")
    for d in docs[:3]:
        ident = d.get('identifier')
        title = d.get('title')
        lic = d.get('licenseurl')
        afiles = get_ia_files(ident)
        mp3s = [f for f in afiles if f['name'].endswith('.mp3')]
        best_audio = mp3s[0] if mp3s else (afiles[0] if afiles else None)
        audio_url = best_audio['url'] if best_audio else 'None'
        print(f"  * [{ident}] {title}")
        print(f"    License: {lic}")
        print(f"    Audio: {audio_url}")
