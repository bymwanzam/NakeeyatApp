import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Wraps the built web app as a native Android and iOS app.
 *
 * The whole of `dist/` is packaged inside the app bundle, which is the real
 * reason to ship native builds at all: the 114 surah files and all 165 audio
 * clips become local assets, so the entire Qur'an is readable and every letter
 * is audible with no connection at all. The web version can only cache a surah
 * once it has already been opened online.
 *
 * Only two things still reach the network, and both already fail softly: the
 * Husary recitation from everyayah.com and the English translation from
 * quran.com. Both are HTTPS, so neither needs an Android cleartext exception
 * nor an iOS App Transport Security exception.
 *
 * After changing anything here, run `npx cap copy` — the native projects read a
 * generated copy of this file, not this file itself.
 */
const config: CapacitorConfig = {
  // This is the permanent identity of the app on a device and in the Play
  // Store and App Store. It can be changed freely now, but never after a first
  // publish -- a different appId is a different app, and updates would not
  // reach anyone who installed the old one. iOS calls this the bundle
  // identifier; keeping one value for both platforms keeps them in step.
  appId: 'com.nakeeyat.app',
  appName: 'Nakeeyat',
  webDir: 'dist',

  server: {
    // Serve from https://localhost rather than file://. The child's profile,
    // stars and cached surahs live in localStorage, and a file:// origin is
    // treated as opaque -- storage written under it can be discarded on
    // upgrade. An https origin keeps it across app updates.
    androidScheme: 'https',

    // iOS has never used file://; its WKWebView is served over the custom
    // capacitor:// scheme, which is a stable, persistent origin, so
    // localStorage already survives app updates without changing anything.
    // Left explicit because the scheme is part of the storage origin: changing
    // it after release would orphan every child's profile and stars, exactly
    // as renaming the appId would.
    iosScheme: 'capacitor',
  },
}

export default config
