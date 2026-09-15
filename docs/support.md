# AI Tamagotchi — Support

An AI-powered digital pet that lives entirely on your phone. Terminal
aesthetic, no accounts, no cloud, no data collection.

---

## Contact

- **Email:** andrej.zwitter@gmail.com
- **Bug reports & feature requests:** https://github.com/Zwandrej/ai-tamagotchi/issues

We aim to reply within a few days.

---

## Frequently asked questions

### My creature isn't using a language model. Is something broken?

No — that's the default, and it's intentional. AI Tamagotchi ships with a
built-in personality engine, so your creature has a personality and reacts to
care, mood and stats from the very first launch, with no download at all.

If you want richer, free-form conversation, you can download a language model:

1. Start a new creature (or open the model picker in the creation flow).
2. Choose a model from the "select brain" list — TinyLlama 1.1B is the
   smallest download and the safest bet on an older phone.
3. Wait for the download to finish, then start chatting.

### How big are the models, and which should I pick?

| Model | Download size | Best for |
|---|---|---|
| Built-in engine (default) | no download | Instant replies, works fully offline |
| Llama 3.2 1B | ~0.7 GB | **Recommended** — best balance of quality and speed |
| TinyLlama 1.1B | ~0.6 GB | Smallest download; replies can be flat and repetitive |
| Gemma 2 2B | ~1.4 GB | Richer conversation, recent phones |
| Phi-2 2.7B | ~1.6 GB | The smartest of the set, wants the most free RAM |

The bigger the model, the slower and more memory-hungry it gets. If replies
feel sluggish on your device, drop down a size.

The two smallest models are close in size but not in quality: TinyLlama is a
smaller base model, and it tends to answer plainly rather than in character.
Unless you are short on space, Llama 3.2 1B is worth the extra ~100 MB.

### Why do model downloads take so long?

They're fetched directly from Hugging Face's servers while you wait — the app
doesn't stage them anywhere else. Keep the app in the foreground and stay on
Wi-Fi for the larger models.

### A download seems stuck at 0%

Restart it. The app watches for a download that stops making progress and, if
no data arrives for 45 seconds, cancels it and tells you rather than sitting
there forever. If it keeps stalling, your network path to Hugging Face is
likely the problem — try a different Wi-Fi network, or turn off any VPN. The
app verifies a model's checksum before using it, so a download that was
interrupted can never be loaded as if it were complete.

### Where does my creature's data live? Can I back it up?

Everything is stored locally on your device, and it's deleted if you delete
the app. To keep a creature, use **export DNA** — that writes a small JSON
file you can save anywhere, and **import DNA** brings it back on any device.

### Can I get my creature onto a new phone?

Export the DNA on the old phone, save the file somewhere you can reach (Files,
AirDrop, iCloud Drive), then install the app on the new phone and import the
DNA when creating a creature. Note that an imported DNA starts a new life —
it carries the creature's genetics, not its exact age or its memories.

### My creature died. Can I bring it back?

No — death is permanent for that individual. Export its DNA before that
happens, and you can raise an offspring with its genetics.

### Does the app need an internet connection?

No. The only time it touches the network is when you choose to download a
language model. Everything else — care, evolution, memory, templates — works
fully offline and in airplane mode.

### What data does the app collect?

None. See the [privacy policy](privacy.md) — no accounts, no analytics, no
tracking, no advertising, and no iOS permissions requested.

### Does it work on iPad / Android?

Version 1.0 is iPhone-only. Android support is planned.
