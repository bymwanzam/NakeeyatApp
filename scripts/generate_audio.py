"""
Render every clip in the audio manifest to public/audio/ with an Arabic
female neural voice.

    python scripts/audio-manifest.mjs     # refresh the list first
    python scripts/generate_audio.py      # then render it

Clips already on disk are skipped, so re-running after adding one word costs
one request, not 165. Pass --force to rebuild everything (needed if you change
VOICE or RATE).

On the voice: ar-SA-ZariyahNeural is Saudi/MSA, which matters for teaching --
an Egyptian voice says "geem" for جِيم and drops the qaf, teaching two letters
incorrectly.

On licensing: edge-tts drives Microsoft Edge's read-aloud service. That is fine
for personal and family use. Before publishing this app, re-render through
Azure Speech (same Zariyah voice, paid, carries redistribution rights) or
replace these clips with a human recording -- only VOICE and the Communicate
call below would change.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "ar-SA-ZariyahNeural"
# Slightly slower than natural: these are teaching clips for children.
RATE = "-15%"
# The service throttles aggressive callers; four at a time is comfortable.
CONCURRENCY = 4
MAX_ATTEMPTS = 3

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "src" / "data" / "audio-manifest.json"
OUT_DIR = ROOT / "public" / "audio"


async def render(text: str, path: Path, sem: asyncio.Semaphore) -> tuple[str, str | None]:
    """Render one clip, retrying on the transient failures the service throws."""
    async with sem:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(path))
                if path.stat().st_size == 0:
                    raise RuntimeError("empty file")
                return text, None
            except Exception as exc:  # noqa: BLE001 - report, don't crash the batch
                if attempt == MAX_ATTEMPTS:
                    path.unlink(missing_ok=True)
                    return text, f"{type(exc).__name__}: {exc}"
                await asyncio.sleep(1.5 * attempt)
    return text, "unreachable"


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="re-render clips that already exist")
    args = parser.parse_args()

    if not MANIFEST.exists():
        print(f"No manifest at {MANIFEST}. Run: node scripts/audio-manifest.mjs", file=sys.stderr)
        return 1

    manifest: dict[str, str] = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    todo = [
        (text, OUT_DIR / name)
        for text, name in manifest.items()
        if args.force or not (OUT_DIR / name).exists()
    ]

    skipped = len(manifest) - len(todo)
    if skipped:
        print(f"{skipped} clip(s) already present, skipping")
    if not todo:
        print("Nothing to do.")
        return 0

    print(f"Rendering {len(todo)} clip(s) with {VOICE} at rate {RATE}...")
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(render(text, path, sem) for text, path in todo))

    failures = [(text, err) for text, err in results if err]
    print(f"\nDone: {len(results) - len(failures)} rendered, {len(failures)} failed")
    for text, err in failures:
        print(f"  FAILED {text!r}: {err}", file=sys.stderr)

    total = sum(f.stat().st_size for f in OUT_DIR.glob("*.mp3"))
    print(f"public/audio/ now holds {len(list(OUT_DIR.glob('*.mp3')))} clips, {total / 1024:.0f} KB")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
