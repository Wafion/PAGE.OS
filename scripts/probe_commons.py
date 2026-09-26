#!/usr/bin/env python3
"""Probe Wikimedia Commons for candidate recordings for each ambience slot."""

import json
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "PAGEOS-AudioBot/2.0 (contact: dev@pageos.app)"}

QUERIES = {
    "gentle-rain": ["rain sound", "gentle rain audio", "rainfall recording"],
    "rain-window": ["rain on window", "rain on roof audio"],
    "thunderstorm": ["thunderstorm audio", "thunder rain"],
    "forest-birds": ["birds singing forest", "birdsong ambience"],
    "forest-night": ["crickets night", "night crickets audio"],
    "ocean-waves": ["ocean waves", "sea waves beach audio"],
    "flowing-river": ["stream water flowing", "river soundscape"],
    "fireplace": ["fireplace crackling", "campfire audio"],
    "cafe": ["cafe ambience", "coffee shop ambience"],
    "library": ["library ambience", "library room tone"],
    "train": ["train ambience", "train ride audio"],
}


def search(query, limit=8):
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f'filetype:audio {query}',
        "gsrnamespace": "6",
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
    out = []
    for page in (data.get("query", {}) or {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "?")
        artist = meta.get("Artist", {}).get("value", "?")
        # strip html from artist
        artist = artist.replace("\u00a0", " ")
        out.append({
            "title": page.get("title"),
            "mime": info.get("mime"),
            "size": info.get("size", 0),
            "seconds": info.get("duration"),
            "license": lic,
            "artist": artist[:60],
            "url": info.get("url"),
        })
    return out


def main():
    only = sys.argv[1:] or list(QUERIES)
    for slot in only:
        print(f"\n=== {slot} ===")
        for q in QUERIES[slot]:
            print(f"  -- query: {q}")
            try:
                for r in search(q):
                    mime = r["mime"] or ""
                    if "audio" not in mime and "ogg" not in mime and "wav" not in mime:
                        continue
                    dur = f"{int(r['seconds'])}s" if r.get("seconds") else "?"
                    print(f"  * {r['title']} | {r['license']} | {dur} | {r['size']//1024}KB | {r['artist']}")
                    print(f"      {r['url']}")
            except Exception as exc:  # noqa: BLE001
                print(f"    error: {exc}")


if __name__ == "__main__":
    main()
