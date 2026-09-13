# Nakeeyat

An Islamic learning app for Muslim children: how to **write** Arabic letters and
how to **read** them. Runs in any browser, so it works on a phone, a tablet or a
laptop with nothing to install.

## Running it

```bash
npm install
npm run dev
```

Then open the printed URL. The `Network:` address works from a phone or tablet
on the same Wi-Fi — that is the one to use for testing finger tracing, since a
mouse is a poor stand-in for a child's finger.

```bash
npm run build          # production bundle into dist/
npm run preview        # serve the built bundle
npm run smoke          # drive the app in a headless browser, screenshots into screenshots/
npm run audio:generate # re-render the spoken clips (needs Python + `pip install edge-tts`)
```

## The child's profile

On first run the app asks for a name, an age and a character, one question per
screen — a four-year-old cannot work through a form, but they can answer one big
question with big buttons.

**This never leaves the device.** It is written to `localStorage` and read back.
There is no account, no server call and no analytics anywhere in this app, so the
only copy of a child's name is the one in their own browser, and clearing site
data erases it completely. That is a deliberate choice for something children
use, and worth preserving if you add features later.

Each detail is collected because it is used, not merely stored:

- **name** — personalises greetings and praise ("Excellent, Aisha!").
- **age** — sets the starting text size (`defaultTextSizeIndex` in
  `src/lib/profile.ts`); under-fives get noticeably larger type.
- **character** — gives the child an avatar on the home screen and in the header.

"Change my name or age" on the home screen reopens the wizard with the existing
values filled in.

## Artwork

The avatars, crescent, star, lantern and dome in `src/components/Mascot.tsx` are
original flat illustrations drawn as inline SVG from basic shapes. Inline rather
than image files so they recolour with the theme, stay crisp at any size on a
tablet, and add nothing to load time.

## The four lessons

| Lesson | What it teaches |
| --- | --- |
| **Write the Letters** | Trace each of the 28 letters with a finger. Scored and starred. |
| **Letter Sounds** | Hear a letter, pick it out of four. Builds recognition. |
| **Letters in Words** | The four shapes a letter takes — alone, start, middle, end. |
| **Read Words** | Harakat → blending → simple words → short Qur'anic words. |
| **The Qur'an** | All 114 surahs, colour-coded by tajweed rule, with recitation. |

Three stars on a traced letter fires a confetti burst (`src/components/Confetti.tsx`),
which uses CSS keyframes rather than a canvas loop so it costs nothing while idle
and respects `prefers-reduced-motion`.

Both an English and an Arabic interface are included; the moon button in the top
right switches between them and flips the layout to RTL.

## How the tracing scoring works

There are no hand-drawn stroke paths. The target letter is rasterised from the
font into an offscreen canvas, and the child's strokes are compared against that
bitmap (`src/lib/tracing.ts`). Two numbers come out:

- **accuracy** — how much of the child's ink landed on the letter. Catches
  scribbling outside the shape.
- **coverage** — how much of the letter the child actually went over. Catches a
  single lazy dash through the middle.

Both are needed for a good score, and the thresholds for 1/2/3 stars sit at the
bottom of that file if they feel too strict or too generous in practice.

The upside of deriving the target from the font is that adding a letter, a
ligature, or a whole new script needs no new stroke data. The trade-off is that
it grades the *shape* a child produced, not the *order or direction* of their
strokes — a letter drawn bottom-up still scores well. Real stroke-order checking
would need per-letter path data.

## Audio

The app ships its own voice. All 165 clips — letter names, example words,
harakat, every letter-plus-vowel blend, and the reading words with their
syllables — are pre-rendered to `public/audio/` in **ar-SA-ZariyahNeural**, a
Saudi/MSA female voice. A child hears the same clear voice on every device,
whether or not that device has any Arabic speech support.

The dialect choice is a teaching decision, not a taste one. An Egyptian voice
pronounces ج as a hard "g" and drops ق to a glottal stop — lovely to listen to,
but it would teach two letters incorrectly. Saudi/MSA keeps them right.

### Regenerating

```bash
npm run audio:generate    # rebuild the manifest, then render anything missing
```

`scripts/audio-manifest.mjs` derives the list of spoken strings from
`src/data/` itself, so adding a letter or a word automatically adds its clip on
the next run — there is no second list to keep in sync. Filenames are a hash of
the Arabic text, so unchanged words keep their existing clip and only new text
costs a request. Use `python scripts/generate_audio.py --force` to re-render
everything (needed if you change the voice or rate).

`scripts/tts_samples.py` renders the same sample line in several candidate
voices into `audio-samples/`, if you want to re-compare.

### Two caveats worth knowing

**Licensing.** `edge-tts` drives Microsoft Edge's read-aloud service. That is
fine for personal and family use. Redistributing these MP3s in a published app
is a legal grey area — before launching, re-render through Azure Speech (same
Zariyah voice, paid, carries redistribution rights) or replace them with a human
recording. Only `VOICE` and the `Communicate` call in the generator change.

**Qur'anic words.** The Qur'an tab teaches short words (قُلْ, هُوَ, أَحَد) as
vocabulary to sound out, not as recitation, which is why synthetic audio is used
there. It is still not a substitute for a qari. Dropping in real recordings named
after the manifest hashes needs no code change at all.

The browser's own text-to-speech remains only as a fallback, for text missing
from the manifest or a clip that fails to load.

## The Qur'an

All 114 surahs, in the Uthmani script, with every letter coloured by the tajweed
rule that applies to it.

### Where the data comes from

```bash
npm run quran:fetch     # re-download; only needed if the source is updated
```

`scripts/fetch-quran.mjs` pulls the Uthmani text with tajweed annotation from the
quran.com API and writes two things:

- `src/data/surahs.json` — 114 surah headers (~14 KB), bundled and always loaded.
- `public/quran/surah-N.json` — one file per surah, 3 MB total, fetched on open.

Splitting per surah is what keeps the app fast: the whole book is far too much
for the main bundle, but one surah is a few KB. Surahs already opened are kept in
`localStorage`, so re-reading them works with no connection.

**The tajweed rule boundaries come from the source data and are never
recalculated in this project.** That is deliberate. Deriving tajweed from raw
text algorithmically is possible but error-prone, and a mistake here would teach
a child to recite incorrectly — a much worse failure than a bug in the star
scoring.

### Colours

The 17 rules and their colours live in `src/data/tajweed-rules.ts`, each with a
one-line explanation aimed at a child ("give the letter a little bounce, like a
small echo"). The palette follows the convention used by quran.com and printed
colour-coded tajweed mushafs rather than anything invented here, so a child who
learns "red means bounce it" finds the same red meaning the same thing in a paper
mushaf. Tapping any coloured letter explains its rule.

### One subtle thing in the renderer

A single Arabic word arrives split across several coloured spans — ٱلنَّاسِ is
five of them. Browsers keep Arabic letters joined across an inline boundary only
while that boundary is an "empty" box, so the `.tj` spans carry a colour and
nothing else. Adding padding, margin, a border or `display: inline-block` there
would visibly tear words apart. The smoke test asserts this rather than trusting
it.

### Recitation and translation

Recitation streams from everyayah.com: **Mahmoud Khalil Al-Husary's muallim
(teaching) recording**, chosen because it is slow and precise enough that each
tajweed rule is audible. Tapping one ayah plays it; "Play surah" plays through
continuously, highlighting each ayah as it goes. Full Qur'an audio is over a
gigabyte, so it streams rather than ships.

The English translation (M.A.S. Abdel Haleem) is **fetched from quran.com at
runtime and never written into this repo**. The Qur'anic text itself is ancient
and free to reproduce, but modern translations are copyrighted works — requesting
one from a source licensed to serve it avoids redistributing text the project has
no rights to. Both audio and translation fail softly: no connection means no
sound and no translation, never a broken page. The Arabic always renders.

## Content

Lesson content is data, kept separate from the UI:

- `src/data/letters.ts` — the 28 letters: forms, names, sounds, example words.
- `src/data/reading.ts` — harakat, blending marks, simple words, Qur'an words.
- `src/i18n.tsx` — every English and Arabic interface string.

Adding a letter, a word or a translation means editing those files only.

## Known gaps

- The per-letter sound hints (`soundEn`) are English-only, so they stay in
  English even when the interface is switched to Arabic.
- The letter *names* are spoken (أَلِف, بَاء), not the letter *sounds* in
  isolation. The Blending tab covers the sounds via بَ بِ بُ.
- Tracing does not check stroke order or direction (see above).
- Progress is stored in `localStorage` — per browser, per device, and cleared
  along with site data. There is no account and nothing leaves the device.
- Qur'an surahs are cached only once opened. A service worker would make the
  whole book readable offline from a cold start; without one, the first open of
  each surah needs a connection.
- The Qur'an reader has no bookmark or last-read position yet.
