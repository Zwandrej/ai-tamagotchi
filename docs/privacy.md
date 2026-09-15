# Privacy Policy — AI Tamagotchi

**Last updated: 15 September 2026**

AI Tamagotchi is a virtual pet that runs entirely on your device. This policy
describes exactly what the app does with your information. The short version:
**nothing you do in the app is collected, transmitted, or shared.**

---

## 1. Information we collect

**We collect nothing.** There is no account, no sign-in, no analytics, no
crash reporting, no advertising, and no tracking of any kind. The developer
of AI Tamagotchi does not receive any information about you or how you use
the app.

## 2. Information stored on your device

Everything the app remembers is stored locally in its own sandbox on your
iPhone, and is deleted when you delete the app:

- Your creature's state — species, name, life stage, stats, mood and age
- Your creature's DNA, including inherited and imported DNA
- Conversation history with your creature
- Memories and life events recorded by the creature engine
- Language model files you choose to download (see section 3)

This data never leaves your device. We cannot read it, and neither can anyone
else. Deleting the app deletes all of it.

## 3. Network connections

AI Tamagotchi works with no network connection at all. It only uses the
network in one situation:

**Optional language model downloads.** To make your creature speak with a
local language model instead of the built-in personality engine, you can
choose to download a model file (90 MB – 1.8 GB). These files are hosted by
[Hugging Face](https://huggingface.co), and the download goes directly from
Hugging Face's servers to your device.

When you start such a download, Hugging Face receives the request, which
includes your IP address and standard HTTP headers, as any web request does.
Hugging Face's handling of that request is governed by the
[Hugging Face Privacy Policy](https://huggingface.co/privacy). No other
information about you is sent — no device identifiers, no usage data, no
information about your creature. You can use the app indefinitely without
ever downloading a model.

Once a model file is on your device, all responses are generated locally.
Your conversations are never sent anywhere. The app makes no other network
requests of any kind.

## 4. Permissions

AI Tamagotchi requests **no iOS permissions**. It does not access your
location, contacts, photos, camera, microphone, calendar, health data, or
advertising identifier.

When you import or export a creature's DNA, the app uses the standard iOS
file picker. That means you choose the exact file, and the app only ever sees
the one file you pick.

## 5. Third-party services and SDKs

The app includes no advertising SDKs and no analytics SDKs. It does not use
the Advertising Identifier (IDFA) and does not track you across apps or
websites.

## 6. Children's privacy

AI Tamagotchi is not directed at children under 13. Because the app collects
no information from anyone, it collects no information from children.

## 7. Your control over your data

- **Delete everything:** delete the app. All locally stored data goes with it.
- **Delete one creature:** remove it from within the app.
- **DNA files:** any DNA you export is a plain JSON file that you control and
  can delete at any time.
- **Model files:** delete downloaded models from within the app to reclaim
  storage space.

Because we never receive your data, there is nothing for us to delete on your
behalf and no data request to make.

## 8. Changes to this policy

If this policy changes, the updated version will be published at this URL with
a new "last updated" date. Material changes will also be noted in the app's
release notes.

## 9. Contact

Questions about this policy: **andrej.zwitter@gmail.com**

AI Tamagotchi is open source — the complete source code, including the code
that handles all local storage, is available at
https://github.com/Zwandrej/ai-tamagotchi
