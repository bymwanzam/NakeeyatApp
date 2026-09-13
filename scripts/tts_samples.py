"""
Generate side-by-side samples of candidate Arabic female voices.

The sample text is chosen to expose dialect differences that matter when
teaching letter sounds:
  جِيم  - fusha "jeem" vs Egyptian hard "geem"
  قَاف  - fusha uvular "qaf" vs a dropped glottal stop in several dialects
  ضَاد  - the emphatic daad, often flattened
A voice that gets these wrong would teach a child the wrong letter.

Run:  python scripts/tts_samples.py
"""

import asyncio
from pathlib import Path

import edge_tts

CANDIDATES = [
    ("ar-SA-ZariyahNeural", "Saudi - closest to fusha/MSA"),
    ("ar-AE-FatimaNeural", "UAE - Gulf, near MSA"),
    ("ar-JO-SanaNeural", "Jordan - Levantine"),
    ("ar-EG-SalmaNeural", "Egypt - warm but dialectal"),
]

SAMPLE = "أَلِف، بَاء، تَاء، جِيم، قَاف، ضَاد. بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيم"

OUT = Path("audio-samples")


async def main() -> None:
    OUT.mkdir(exist_ok=True)
    for voice, note in CANDIDATES:
        path = OUT / f"{voice}.mp3"
        # rate is slowed a little: these are teaching clips, not narration.
        await edge_tts.Communicate(SAMPLE, voice, rate="-15%").save(str(path))
        print(f"  {path}  ({note})")


if __name__ == "__main__":
    asyncio.run(main())
