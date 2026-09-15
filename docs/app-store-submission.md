# App Store submission pack — AI Tamagotchi v1.0

Everything you need to paste into App Store Connect, plus the exact answers to
the review questions. Values marked `<...>` need your input.

---

## 0. Prerequisites (blocking)

| # | Requirement | Status |
|---|---|---|
| 1 | Paid **Apple Developer Program** membership ($99/yr) — a free Apple ID can't publish | ⬜ not enrolled |
| 2 | **Xcode** installed, signed in with your Apple ID | ⬜ not installed |
| 3 | **CocoaPods** installed (Homebrew route) | ⬜ blocked on system Ruby 2.6 |
| 4 | Bundle ID `com.zwitter.aitamagotchi` registered in the developer portal | ⬜ |
| 5 | App record created in App Store Connect | ⬜ |
| 6 | Privacy policy + support pages publicly reachable | ⬜ docs written, not hosted |

⚠️ **Enrol in the Apple Developer Program first.** Approval can take 24–72
hours and everything else (bundle ID registration, App record, signing
certificates, TestFlight) depends on it. Start it while Xcode downloads.

---

## 1. App Store listing copy

### Pricing

**Free**, no in-app purchases. Decided for the 1.0 release: it maximizes
reviews and TestFlight feedback, and there is no server cost to recover (all
inference is on-device). Leave the price tier at "Free" and do not create any
in-app purchase products.

### Name (30 char max)
```
AI Tamagotchi
```

### Subtitle (30 char max)
```
On-device AI pet. No cloud.
```

### Promotional text (170 char max)
```
A digital creature with DNA, memory and personality — driven by a language model running entirely on your iPhone. No account, no cloud, no data collection.
```

### Category
- **Primary:** Games → Simulation
- **Secondary:** Entertainment

### Keywords (100 char max, comma separated, no spaces)
```
virtual pet,tamagotchi,ai companion,llm,offline,local,creature,chat simulator,evolution,dna
```

### Description

```
A living creature that runs entirely on your iPhone.

AI Tamagotchi is a terminal-styled digital pet with real DNA, real memory and
a real personality — driven by a small language model that runs on your
device. No account. No cloud. No API keys. Nothing you say ever leaves your
phone.

── A CREATURE, NOT A CHATBOT ──

Your creature has genes. Five species traits, six personality axes and an
appearance, all generated from a seed you can keep, re-roll or import. Its
genes decide how it behaves, and the way you treat it decides how those genes
are expressed — memories literally reshape its epigenome over its life.

── FIVE STAGES, FOUR BRANCHES ──

It hatches, grows, and evolves. The path it takes depends on how you raise it:
a well-cared-for creature grows up differently from a neglected one. Look
after it long enough and it reaches adulthood with a personality of its own.
Neglect it completely and it can die — permanently. Export the DNA first and
you can raise its offspring.

── CARE THAT MATTERS ──

Feed it, play with it, clean it, heal it, tuck it in, wake it, scold it. Every
action moves its stats, its mood and its personality, and every creature
responds in its own voice, shaped by its age, its mood and its genes. A baby
speaks in two-word fragments; an adult argues with you.

── CONVERSATION THAT REMEMBERS ──

Talk to your creature. It remembers what you discussed, and those memories
feed back into how it behaves. Watch it change as it grows up.

── ON-DEVICE, OR NOTHING AT ALL ──

The app works fully offline with a built-in personality engine — no download
required, ever. If you want richer, free-form conversation, you can optionally
download a small language model (90 MB – 1.8 GB) and choose which one fits
your phone. All inference happens locally on the Neural Engine and GPU.

Zero accounts. Zero analytics. Zero tracking. Zero iOS permissions requested.
No internet connection needed to use the app.

── TERMINAL AESTHETIC ──

Amber-on-black phosphor, ASCII creatures, and a UI that looks like the machines
that raised us. Light and dark themes included.

── OPEN SOURCE ──

The complete source is on GitHub, including the code that stores your data:
https://github.com/Zwandrej/ai-tamagotchi
```

### What's New (v1.0)
```
First release.

* Create a creature from scratch or from imported DNA
* 5 life stages, 4 evolution branches, permanent death
* 7 care actions, real-time stats, mood and personality systems
* Epigenome and episodic memory that reshape your creature as it ages
* Optional on-device language models for free-form conversation
* Fully offline — no account, no analytics, no tracking
```

---

## 2. URLs

| Field | Value |
|---|---|
| Support URL | `https://<your-github-username>.github.io/ai-tamagotchi/support.html` (or the repo issues page) |
| Marketing URL | `https://github.com/Zwandrej/ai-tamagotchi` |
| Privacy Policy URL | `https://<your-github-username>.github.io/ai-tamagotchi/privacy.html` |

**Hosting:** the policy and support pages are committed as `docs/privacy.md`
and `docs/support.md`. To publish them, enable GitHub Pages for the repo:
**Settings → Pages → Source: Deploy from a branch → Branch: `main`, folder:
`/docs`**. GitHub then renders them at the URLs above. Both URLs must load for
a reviewer, or the submission is rejected.

---

## 3. App Privacy answers (App Store Connect → App Privacy)

- **Do you or your third-party partners collect data from this app?** → **No**
- Data types collected: **none**
- Tracking: **No**
- The labels come out as **"Data Not Collected"**, which is accurate: no
  account, no analytics, no crash SDK, no ads, no IDFA. The only network
  request the app makes is a model download from Hugging Face that you initiate
  yourself, which sends no data about you.

---

## 4. Age rating

- **Recommended: 12+**
- The app contains an optional user-facing AI chat. The creature's system
  prompt includes an explicit guard against hateful, sexual, violent or illegal
  output, and there is **no user-to-user content sharing anywhere in the app**
  (nothing a user types is ever shared with or visible to another user).

If you would rather be conservative about unfiltered generative output, choose
**16+** — it costs discoverability but removes any argument. Do not choose 4+
with an unfiltered AI chat.

Answers to the questionnaire:
- Cartoon or fantasy violence: **None**
- Realistic violence / sexual content / nudity / profanity: **None**
- Alcohol, tobacco, drugs, gambling: **None**
- Horror/fear themes: **None**
- Unrestricted web access: **No**
- User-generated content sharing: **No**

---

## 5. Screenshots

Required: **6.9" iPhone** display, 1320 × 2868 px (portrait), 3–10 images.
No iPad screenshots needed — v1.0 is iPhone-only (`TARGETED_DEVICE_FAMILY = 1`).

Suggested set, captured from the iPhone 17 Pro Max simulator:

1. Creature on the home screen showing stats and ASCII art
2. Care actions in progress
3. Chat with the creature mid-conversation
4. The evolution / life-stage view
5. DNA + memory viewer
6. Model picker showing on-device models

Capture with `xcrun simctl io booted screenshot shot1.png`, then check the
dimensions before upload. Text overlays are optional; plain captures are fine
and look honest.

---

## 6. App Review notes (paste into "Notes" — this matters)

```
AI Tamagotchi is a virtual pet that runs entirely on-device.

1. NO ACCOUNT, NO LOGIN. Launch the app and you land straight in the creature
creation flow. Nothing needs to be set up or signed into.

2. THE APP WORKS WITH NO NETWORK CONNECTION. The creature has a built-in
personality engine (rule-based, in TypeScript) that handles all conversation
and behaviour out of the box. You can review the entire app in airplane mode.

3. THE LANGUAGE MODEL IS OPTIONAL AND USER-INITIATED. In the "select brain"
list on the creation screen you can optionally download a small GGUF language
model (90 MB – 1.8 GB) from Hugging Face. The model runs locally via llama.cpp
(llama.rn). Nothing is sent to any server for inference — there is no
inference API involved. No model is bundled or required; the app never
downloads anything without a tap.

4. THE AI CHAT IS NOT A USER-GENERATED CONTENT SERVICE. There is no feed, no
sharing, no accounts and no way for one user to see another user's content.
Conversations, memories and DNA are stored only in the app's own sandbox and
are deleted with the app.

5. NO PERMISSIONS ARE REQUESTED. No location, contacts, photos, camera,
microphone, tracking or notifications.

Suggested review path: launch → pick a species → name it → Create → use the
care buttons on the home screen → open Chat and typed replies work via the
built-in engine → export/import DNA from the creature menu.
```

---

## 7. Build & upload sequence (once Xcode is installed)

```bash
cd ~/dev/ai-tamagotchi

# 1. toolchain
xcode-select --switch /Applications/Xcode.app
xcodebuild -runFirstLaunch
brew install cocoapods

# 2. pods (Podfile patches fmt for Xcode 26 — see post_install hook)
cd ios && pod install && cd ..

# 3. sanity checks
npm test          # jest suite must be green
npx tsc --noEmit  # typecheck

# 4. pre-flight: an UNSIGNED device archive. This needs no team or developer
#    account and proves the real App Store compile path (arm64 device slice,
#    llama.rn device slice, Hermes bytecode, asset catalog, privacy manifests)
#    before anything can block on signing.
rm -rf /tmp/ai-dd-dev /tmp/AITamagotchi.xcarchive
xcodebuild -workspace ios/AITamagotchi.xcworkspace -scheme AITamagotchi \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/ai-dd-dev \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  archive -archivePath /tmp/AITamagotchi.xcarchive

# 5. open the workspace, sign the app target with your team, then
#    Product → Archive → Distribute App → App Store Connect → Upload
open ios/AITamagotchi.xcworkspace
```

### Notes for this project (Xcode 26/27 era)

- **The UIScene lifecycle is mandatory.** Apps built with the iOS 26+ SDK are
  refused at launch without it: *"Application failed to launch: UIScene life
  cycle is required for apps built with this SDK."* React Native 0.82's
  template is still window-based and ships no `SceneDelegate`, so this project
  implements one (`SceneDelegate` in `ios/AITamagotchi/AppDelegate.swift`,
  declared through `UIApplicationSceneManifest`). If you regenerate the iOS
  project from a template, you must re-apply this.
- **Xcode 27 has no `Simulator.app`.** It was replaced by
  `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`
  (`com.apple.dt.Devices`), and `open -a Simulator` fails. Drive simulators
  headlessly with `xcrun simctl` (`boot`, `install`, `launch`,
  `io booted screenshot`) — that works regardless.
- Do not commit `ios/.xcode.env.local`. It pins `NODE_BINARY` to one machine's
  path and breaks the `[Hermes]` and `Bundle React Native code and images`
  script phases on any other machine.

Then: App Store Connect → your app → TestFlight (wait for processing) →
submit for review with the metadata above. Use TestFlight on your own device
first — the release build is what reviewers see, and local inference
performance is worth checking on real hardware.

---

## 8. Known `npm audit` findings (not a submission blocker)

`npm audit` reports 17 advisories (9 high, 7 moderate, 1 low). Apple does not
scan npm dependencies, and none of these are reachable in the shipped app:

| Package | Chain | Ships in the app? |
|---|---|---|
| metro, metro-config, metro-transform-worker | RN build tooling | No |
| shell-quote | `@react-native-community/cli`, react-devtools-core | No |
| js-yaml | cosmiconfig, eslint, babel-plugin-istanbul | No |
| browserslist, image-size, brace-expansion, joi, qs, body-parser, launch-editor, baseline-browser-mapping | build tooling | No |
| nanoid@3.3.12 | `@react-navigation/native` → core → routers | Yes — DoS only with an attacker-controlled `size` |
| query-string@7.1.3 → decode-uri-component | `@react-navigation/core` | Yes — DoS only with crafted input |

Neither runtime package is imported by app code; both arrive as transitive
dependencies of React Navigation, and their advisories all require
attacker-controlled input to those specific functions, which nothing in this
app passes. Every other advisory is in the build pipeline, where the only
input is the developer's own configuration.

**Do not run `npm audit fix` before the first verified build.** It moves
transitive versions of metro and the jest/CLI tooling — exactly the layer
React Native 0.82's build is sensitive to. Get a green archive first, so that
any breakage from a later audit fix is attributable to it.

---

## 9. Pre-submission checklist

- [x] Widget target removed from the Xcode project (v1.1 feature)
- [x] Dangling widget target references removed from `project.pbxproj`
- [x] App icon alpha channels stripped (ITMS-90717)
- [x] Empty `NSLocationWhenInUseUsageDescription` removed — no permissions at all
- [x] `CFBundleDisplayName` = "AI Tamagotchi"
- [x] iPhone-only device family
- [x] `ITSAppUsesNonExemptEncryption = false` (skips export compliance prompt)
- [x] Dark interface style forced (terminal theme)
- [x] Privacy manifest present (`PrivacyInfo.xcprivacy`)
- [x] Test suite compiles and passes (95 tests, 3 suites)
- [x] Model downloads verified against the published SHA-256 digest before use
- [x] Model catalog: dead upstream URL removed, real artifact sizes recorded
- [x] Dev-name hardcoded in the creature prompt removed
- [x] Content guard added to the creature system prompt
- [x] Pricing decided: free, no in-app purchases
- [x] Support email filled in (andrej.zwitter@gmail.com)
- [ ] Paid developer membership active
- [ ] Privacy policy + support pages live at public URLs
- [ ] Xcode installed, pods installed, archive builds clean
- [ ] Signing: app target → your team, automatic signing
- [ ] Screenshots captured (6.9")
- [ ] Tested on a physical iPhone with the release build
- [ ] TestFlight build processed without warnings
- [ ] App record: name, subtitle, description, keywords, category, age rating
- [ ] App Privacy: "Data Not Collected"
- [ ] Review notes pasted
