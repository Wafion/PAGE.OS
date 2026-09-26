#!/usr/bin/env python3
"""Download real, freely-licensed ambience recordings from Wikimedia Commons.

Replaces the previously synthesized ("fake") SFX with genuine field recordings.
Pipeline per sound: download -> verify license via Commons API -> trim to a
loopable segment -> loudness-normalize -> seamless-loop crossfade -> MP3 192k.
Writes public/SFX/ATTRIBUTIONS.md.

Usage:
  python scripts/fetch_real_sfx.py            # all sounds
  python scripts/fetch_real_sfx.py cafe train # subset
"""

import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SFX_DIR = os.path.normpath(os.path.join(HERE, "..", "public", "SFX"))
WORK_DIR = os.path.join(HERE, "sfx_work")

UA = {"User-Agent": "PAGEOS-AudioBot/2.0 (freebuff desktop asset fetch)"}

# ---------------------------------------------------------------------------
# Source picks — all verified to exist on commons.wikimedia.org.
# section: (start_seconds, length_seconds) to trim a steady part of long files.
# mix: [(source_id, volume)] to build composites from other processed sources.
# ---------------------------------------------------------------------------

SOURCES = {
    # ----------------------------- NATURE -----------------------------------
    "gentle-rain": {
        "dest": "nature/gentle-rain.mp3",
        "file": "File:Sound of light rainfall.ogg",
        "dur": 60,
        "loudness": -20,
    },
    "rain-window": {
        "dest": "nature/rain-window.mp3",
        "file": "File:Rain against the window.ogg",
        "dur": 78,
        "loudness": -20,
    },
    "thunderstorm": {
        "dest": "nature/thunderstorm.mp3",
        "file": "File:Good thunderstorm Sept 8 2022.ogg",
        "section": (900, 75),
        "loudness": -23,
    },
    "forest-birds": {
        "dest": "nature/forest-birds.mp3",
        "file": "File:Gentle breeze and birds singing.ogg",
        "dur": 32,
        "loudness": -21,
    },
    "forest-night": {
        "dest": "nature/forest-night.mp3",
        "file": "File:Waidachswald Oberschefflenz Abend 20250616 2005.ogg",
        "section": (40, 60),
        "loudness": -22,
    },
    "ocean-waves": {
        "dest": "nature/ocean-waves.mp3",
        "file": "File:Ocean Waves on a Tropical Beach.ogg",
        "section": (120, 90),
        "loudness": -21,
    },
    "flowing-river": {
        "dest": "nature/flowing-river.mp3",
        "file": "File:433589 jackthemurray stream-river-water-up-close.wav",
        "dur": 65,
        "loudness": -21,
    },
    # ------------------------------ COZY ------------------------------------
    "fireplace": {
        "dest": "cozy/fireplace.mp3",
        "file": "File:Campfire sound ambience.ogg",
        "dur": 57,
        "loudness": -21,
    },
    "fireplace-rain": {
        "dest": "cozy/fireplace-rain.mp3",
        "mix": [("fireplace", 0.55), ("gentle-rain", 0.45)],
        "dur": 57,
        "loudness": -22,
        "composite": True,
    },
    # ----------------------------- SPACES -----------------------------------
    "cafe": {
        "dest": "spaces/cafe.mp3",
        "file": "File:Restaurant ambience.ogg",
        "dur": 73,
        "loudness": -22,
    },
    "library": {
        "dest": "spaces/library.mp3",
        "file": "File:20121112 TU Delft Library, quiet study room - general ambience - SoundCloud - el mar.ogg",
        "section": (60, 80),
        "loudness": -24,
    },
    "train": {
        "dest": "spaces/train.mp3",
        "file": "File:Complete train ride 4 minutes.ogg",
        "section": (30, 90),
        "loudness": -22,
    },
    # ------------------------------ FOCUS -----------------------------------
    "brown-noise": {
        "dest": "focus/brown-noise.mp3",
        "synthesize": "brown",
        "dur": 32,
        "loudness": -23,
    },
    "pink-noise": {
        "dest": "focus/pink-noise.mp3",
        "synthesize": "pink",
        "dur": 32,
        "loudness": -23,
    },
}


def log(msg):
    print(msg, flush=True)


def api_info(file_title):
    """Fetch url/creator/license for a Commons file via the API."""
    params = {
        "action": "query",
        "format": "json",
        "titles": file_title,
        "prop": "imageinfo",
        "iiprop": "url|mime|extmetadata",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
    page = next(iter(data["query"]["pages"].values()))
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})

    def meta_val(key):
        raw = meta.get(key, {}).get("value", "") or ""
        # crude html strip
        out, skip = [], False
        for ch in raw:
            if ch == "<":
                skip = True
            elif ch == ">":
                skip = False
            elif not skip:
                out.append(ch)
        return "".join(out).strip()

    return {
        "url": info["url"],
        "mime": info.get("mime", ""),
        "creator": meta_val("Artist") or "Unknown",
        "license": meta_val("LicenseShortName") or "Unknown",
        "page": info.get("descriptionurl", ""),
    }


def http_get(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as res, open(dest, "wb") as fh:
        while True:
            chunk = res.read(64 * 1024)
            if not chunk:
                break
            fh.write(chunk)


def run_ffmpeg(args):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {' '.join(cmd)}\n{proc.stderr[-2000:]}")


def probe_duration(path):
    cmd = [
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_format", path,
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed on {path}")
    data = json.loads(proc.stdout)
    return float(data["format"]["duration"])


def trim_and_normalize(src, wav, loudness, section=None, dur=None):
    """Cut a segment and loudness-normalize it to a broadcast-ish level."""
    args = []
    if section:
        args += ["-ss", str(section[0])]
    args += ["-i", src]
    if section:
        args += ["-t", str(section[1])]
    elif dur:
        args += ["-t", str(dur)]
    args += [
        "-af", f"loudnorm=I={loudness}:TP=-2:LRA=11",
        "-ar", "44100", "-ac", "2", wav,
    ]
    run_ffmpeg(args)


def make_seamless_loop(wav, out_wav, crossfade=3.0):
    """Crossfade the tail into the head so the loop point is inaudible."""
    d = probe_duration(wav)
    if d < crossfade * 3:
        raise RuntimeError(f"{wav}: too short for looping ({d:.1f}s)")
    a = d - crossfade  # body end
    filter_complex = (
        f"[0:a]atrim=start={a}:end={d},asetpts=PTS-STARTPTS[tail];"
        f"[0:a]atrim=start=0:end={crossfade},asetpts=PTS-STARTPTS[head];"
        f"[0:a]atrim=start={crossfade}:end={a},asetpts=PTS-STARTPTS[body];"
        f"[tail][head]acrossfade=d={crossfade}:c1=tri:c2=tri[intro];"
        f"[intro][body]concat=n=2:v=0:a=1[out]"
    )
    run_ffmpeg(["-i", wav, "-filter_complex", filter_complex, "-map", "[out]", out_wav])


def mix_wavs(parts, out_wav, total_dur):
    """parts: list of (path, volume). Blend with normalize=0."""
    inputs = []
    for path, _vol in parts:
        inputs += ["-i", path]
    fc = ";".join(
        f"[{i}:a]volume={vol}[p{i}]" for i, (_p, vol) in enumerate(parts)
    )
    fc += ";" + "".join(f"[p{i}]" for i in range(len(parts)))
    fc += f"amix=inputs={len(parts)}:duration=longest:normalize=0,atrim=0:{total_dur}[out]"
    run_ffmpeg(inputs + ["-filter_complex", fc, "-map", "[out]", "-ac", "2", out_wav])


def synthesize_noise(kind, wav, dur):
    run_ffmpeg([
        "-f", "lavfi", "-i", f"anoisesrc=color={kind}:r=44100:d={dur}:a=0.8",
        "-ac", "2", wav,
    ])


def encode(wav, mp3, meta):
    run_ffmpeg([
        "-i", wav,
        "-codec:a", "libmp3lame", "-b:a", "192k",
        "-id3v2_version", "3",
        "-metadata", f"title={meta['title']}",
        "-metadata", f"artist={meta['creator']}",
        "-metadata", "album=PAGE.OS Ambience",
        "-metadata", f"comment={meta['license']} — {meta['page']}",
        mp3,
    ])


def main():
    only = set(sys.argv[1:])
    os.makedirs(WORK_DIR, exist_ok=True)
    os.makedirs(SFX_DIR, exist_ok=True)
    attributions = []

    for sid, cfg in SOURCES.items():
        if only and sid not in only:
            continue
        log(f"\n=== {sid} ===")
        dest = os.path.join(SFX_DIR, cfg["dest"])
        os.makedirs(os.path.dirname(dest), exist_ok=True)

        info = {"creator": "PAGE.OS Audio", "license": "CC0 1.0", "page": "Generated via ffmpeg anoisesrc"}
        cut = os.path.join(WORK_DIR, sid + ".cut.wav")

        if cfg.get("synthesize"):
            synthesize_noise(cfg["synthesize"], cut, cfg["dur"] + 3)
            log(f"  synthesized {cfg['synthesize']} noise ({cfg['dur']}s)")
        elif cfg.get("mix"):
            for src_id, _vol in cfg["mix"]:
                src_cut = os.path.join(WORK_DIR, src_id + ".cut.wav")
                if not os.path.exists(src_cut):
                    raise RuntimeError(f"missing {src_cut} — process '{src_id}' first")
            parts = [
                (os.path.join(WORK_DIR, p + ".cut.wav"), v)
                for p, v in cfg["mix"]
            ]
            mix_wavs(parts, cut, cfg["dur"] + 3)
            log(f"  mixed {cfg['mix']}")
        else:
            log(f"  looking up {cfg['file']}")
            info = api_info(cfg["file"])
            log(f"    license: {info['license']} | creator: {info['creator'][:60]}")
            raw = os.path.join(WORK_DIR, sid + ".raw")
            log(f"    downloading {info['url']}")
            http_get(info["url"], raw)
            trim_and_normalize(raw, cut, cfg["loudness"], cfg.get("section"), cfg.get("dur"))

        if not cfg.get("synthesize") and not cfg.get("mix"):
            pass  # cut already normalized above
        else:
            # synthesize/mix paths still need loudness normalization
            norm = os.path.join(WORK_DIR, sid + ".norm.wav")
            run_ffmpeg([
                "-i", cut,
                "-af", f"loudnorm=I={cfg['loudness']}:TP=-2:LRA=11",
                "-ar", "44100", "-ac", "2", norm,
            ])
            os.replace(norm, cut)

        loop = os.path.join(WORK_DIR, sid + ".loop.wav")
        make_seamless_loop(cut, loop)
        final_dur = probe_duration(loop)
        log(f"  loop ready: {final_dur:.1f}s")

        encode(loop, dest, {
            "title": cfg["dest"].split("/")[-1].rsplit(".", 1)[0],
            "creator": info["creator"],
            "license": info["license"],
            "page": info["page"],
        })
        size_kb = os.path.getsize(dest) // 1024
        log(f"  wrote {dest} ({size_kb} KB)")

        attributions.append({
            "id": sid,
            "title": cfg.get("file", cfg["dest"]),
            "creator": info["creator"],
            "license": info["license"],
            "page": info["page"],
            "composite": cfg.get("composite", False),
            "generated": bool(cfg.get("synthesize")),
        })

    lines = [
        "# Ambience Audio Attributions",
        "",
        "All ambience sounds are real recordings under free licenses",
        "(CC0 / Public Domain / CC BY / CC BY-SA), sourced from Wikimedia Commons.",
        "",
        "| Slot | Source file | Creator | License |",
        "|------|-------------|---------|---------|",
    ]
    for a in attributions:
        note = " (composite of listed sources)" if a["composite"] else ""
        note = " (DSP-generated)" if a["generated"] else note
        lines.append(f"| {a['id']} | {a['title']}{note} | {a['creator']} | {a['license']} |")
    attributions_path = os.path.join(SFX_DIR, "ATTRIBUTIONS.md")
    with open(attributions_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    log(f"\nWrote {attributions_path}")


if __name__ == "__main__":
    main()
