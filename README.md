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

## Deploying

### As a web app

`npm run build` produces `dist/`, which is a plain static site — no server code,
no Node needed at the other end. Upload the *contents* of `dist/` to the web
root and that is the whole deployment.

`public/.htaccess` is copied into every build and carries the Apache config:
gzip (Al-Baqarah drops from 290 KB to 32 KB, which is the difference between a
surah opening instantly and a child giving up), cache headers, and no directory
listings. It deliberately contains **no rewrite rules** — the app keeps its
views in React state and has no router, so there are no URLs to rewrite. An SPA
fallback would turn a genuinely missing surah file into a 200 full of HTML,
which is far harder to diagnose than a clean 404.

Zipping `dist/` on Windows needs care: .NET's `CreateFromDirectory` writes entry
names with backslashes, which the ZIP spec forbids and Linux extractors read as
literal filenames — the whole tree ends up flattened into the web root. Build
the archive with explicit forward slashes.

### As an Android app

```bash
npm run build
npx cap copy          # refresh the bundled web assets
npm run android:apk   # assemble the debug APK
```

The APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`.

The point of the Android build is offline: the whole of `dist/` is packaged
inside the APK, so all 114 surahs and all 165 audio clips are local assets.
The web version can only cache a surah once it has already been opened online,
so this is the only way the entire Qur'an is readable from a cold start with no
connection. Only the Husary recitation and the English translation still reach
the network, and both already fail softly.

`INTERNET` is the only permission the app requests — no camera, location, or
storage — which is worth keeping true for something children use.

Two toolchain notes, both of which cost an afternoon if you hit them cold:

- **Build with a JDK 21.** Gradle 8.14's Groovy cannot parse JDK 25 class files
  and fails with `Unsupported class file major version 69`. Confusingly
  `./gradlew --version` still succeeds on JDK 25, because the failure only
  happens once it compiles the build scripts.
- **`android/local.properties` must use forward slashes.** It is a Java
  `.properties` file, where a backslash is an escape character, so a Windows
  `C:\Users\...` path is silently mangled into the misleading error
  `The filename, directory name, or volume label syntax is incorrect`.

### As an iOS app

Building for iOS needs a Mac with Xcode; Apple's toolchain does not run
anywhere else. Everything up to that point is the same on Windows — the iOS
project is generated, edited and committed like any other source, and only the
final compile has to happen on a Mac.

```bash
npm install
npm run ios:sync     # build the web app and copy dist/ into the Xcode project
npm run ios:open     # open ios/App/App.xcodeproj in Xcode
```

Then pick a team under **Signing & Capabilities** and press Run. The bundle
identifier is `com.nakeeyat.app`, the same string as the Android `appId`, so
the two stores hold one app rather than two.

**On a fresh clone, `npm run ios:sync` is not optional.** `ios/App/App/public`
is where the built web app lives inside the Xcode project, and it is ignored by
git — as it should be, since it is 3 MB of generated output. Open the project
without running the sync first and it compiles to a white screen, which looks
like a bug in the app rather than a missing build step.

The point of the iOS build is the same as the Android one: the whole of `dist/`
is copied into the app bundle, so all 114 surahs and all 165 audio clips are
local files. Only the Husary recitation and the English translation still reach
the network. Both are HTTPS, so App Transport Security is satisfied as it
stands and `Info.plist` needs no exception. The app asks for no permissions at
all — no camera, microphone, photos or location — which is why it carries none
of the usage-description keys.

Four things are worth knowing before the first build:

- **There is no CocoaPods step.** Capacitor 8 wires its native code through
  Swift Package Manager (`ios/App/CapApp-SPM`), which is why `npx cap add ios`
  ran on Windows in the first place. Xcode resolves `capacitor-swift-pm` from
  GitHub on the first build, so that one build needs a connection.
- **The silent switch would otherwise mute the lessons.** A `WKWebView` plays
  HTML audio under the *ambient* audio category, which the ring/silent switch
  silences — a child would trace and tap through a whole lesson in silence with
  nothing on screen to explain it. `AppDelegate.swift` claims the `.playback`
  category at launch to prevent that. It deliberately does not *activate* the
  session there, which would cut off whatever the family was already listening
  to before the child had touched anything.
- **The safe-area padding in `styles.css` is load-bearing here.** `index.html`
  asks for `viewport-fit=cover`, so without it the child's name sits behind the
  clock and the bottom row of letters behind the home indicator. Those rules
  cost the web build nothing, because every inset is zero in a browser.
- **Test tracing on a real device.** The simulator's mouse pointer is as poor a
  stand-in for a child's finger as it is in the browser.

Deployment target is iOS 15, built for both iPhone and iPad, since a tablet is
the better surface for tracing.

`ITSAppUsesNonExemptEncryption` is set to `false` in `Info.plist`: the only
encryption in the app is ordinary HTTPS, which is exempt. Without the key every
TestFlight and App Store upload halts and asks the export-compliance question
again before it will process the build.

### Getting it onto an iPhone

`npm run ios:bundle` writes `nakeeyat-ios-xcode.zip` — the whole project with
the built web app already copied into `ios/App/App/public`. Copy it to the Mac
and unzip it. **Node is not needed on that Mac** to build what is in the zip:
the web app is prebuilt, and Capacitor's native code comes from Swift Package
Manager, which Xcode fetches itself. Node is only needed there if you want to
change the app and rebuild it on the Mac rather than re-zipping from Windows.

Use the script rather than zipping the folder by hand. PowerShell's
`Compress-Archive` is .NET's `ZipFile`, which writes entry names with
backslashes; macOS reads those as literal filenames and the tree arrives
flattened, the same trap recorded for `dist/` further up. `scripts/ios-bundle.mjs`
calls Windows' own `System32\tar.exe` by full path -- Git Bash puts GNU tar
ahead of it on `PATH`, and GNU tar given `-a` and a `.zip` name writes an
uncompressed *tar* called `.zip` and exits 0 -- then checks that the result
really does begin `PK`, so a wrong-format archive fails here instead of on the
Mac.

1. Open `ios/App/App.xcodeproj`.
2. **Xcode → Settings → Accounts**, add your Apple ID.
3. Select the **App** target → **Signing & Capabilities** → tick *Automatically
   manage signing* and pick your team. A plain Apple ID appears as
   *(Personal Team)* and is enough to get started.
4. Plug the iPhone in, choose it as the run destination, and press Run. The
   first build resolves `capacitor-swift-pm` from GitHub, so it needs a
   connection once.
5. The first launch on the phone will refuse with an untrusted-developer error.
   On the iPhone: **Settings → General → VPN & Device Management**, tap your
   developer certificate, trust it. Then open Nakeeyat.

What a free Apple ID gets you, and where it stops:

- The app installs only onto iPhones connected to that Mac. There is no way to
  send it to anyone else.
- It stops launching after **seven days**. Re-running it from Xcode renews it.
- Three apps at a time per Apple ID.

Sharing it with other people means joining the **Apple Developer Program, $99 a
year**. That is what unlocks TestFlight, which is the sane way to distribute a
children's app to families for testing: they install from a link, and each
build stays valid for 90 days. There is no free route onto someone else's
iPhone — sideloading services exist, but none of them are appropriate for
something you intend to hand to other people's children.

Two settings to know before you submit anything to the App Store. `appId` in
`capacitor.config.ts` is the permanent identity of the app and must match
`PRODUCT_BUNDLE_IDENTIFIER` in Xcode; and an app aimed at children lands in the
Kids Category, which is reviewed against stricter rules than an ordinary app —
no third-party analytics, no behavioural advertising, and parental gates in
front of anything that leaves the app. Nakeeyat already collects nothing and
sends nothing, so this costs nothing to comply with, but it is worth not
breaking later.

### The icons

The Android launcher icon is generated from the same dome drawn in
`src/components/Mascot.tsx`, so the home screen matches the app it opens.

```bash
npm run ios:assets    # rewrite the iOS app icon and launch image
```

`scripts/ios-assets.mjs` redraws that same artwork for iOS and rasterises it
with the copy of headless Chromium that Playwright already installs for the
smoke test, so there is no image toolchain to set up. It writes the PNGs by
hand rather than using `screenshot()` for one reason: an iOS app icon may not
carry an alpha channel, App Store Connect rejects one that does, and every easy
route out of Node — Playwright's screenshot, canvas `toDataURL` — produces
RGBA. Editing the artwork means editing the SVG at the top of that file.

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
