# Model Compatibility & Benchmarks

Which tiny LLMs work on your phone, how fast they run, and what to expect.

---

## Tier System

| Tier | Meaning |
|------|---------|
| 🟢 **Tier 1** | Fully tested, recommended default, works on all supported devices |
| 🟡 **Tier 2** | Tested on 2+ devices, good alternative |
| 🟠 **Tier 3** | Experimental — community tested, may have quirks |
| 🔴 **Tier 4** | Not recommended — too large, wrong architecture, or known issues |

---

## 🟢 Tier 1: Recommended Models

### SmolLM2-135M (Q4_K_M)

```
Size:  ~90 MB
RAM:   256 MB minimum
Speed: 40-55 tok/s (all devices)
```

| Pros | Cons |
|------|------|
| Tiny — fits on any phone | Limited conversational depth |
| Fastest inference of any model | May repeat itself |
| Perfect for quick, snappy responses | Doesn't handle complex topics well |
| Great battery life | |

**Best for:** Users who want snappy interactions, older phones, or prefer frequent short chats.

**Personality prompt effectiveness:** ⭐⭐ — Simple but consistent. Works well with short, directive system prompts.

---

### SmolLM2-360M (Q4_K_M) ⭐ **DEFAULT**

```
Size:  ~240 MB
RAM:   512 MB minimum
Speed: 20-30 tok/s (modern phones)
```

| Pros | Cons |
|------|------|
| Best size-to-quality ratio | Occasional repetition in long chats |
| Coherent personality | Can be too "helpful" — needs good prompt to stay in character |
| Good emotional range | |
| Fits on virtually any phone | |

**Best for:** The default choice. Works on every supported device with good personality.

**Personality prompt effectiveness:** ⭐⭐⭐ — Holds character well with a good system prompt. Shows emotion convincingly.

**Recommended config:**
```json
{
  "contextSize": 2048,
  "threads": 4,
  "gpuLayers": 27,
  "temperature": 0.8,
  "topP": 0.9,
  "repeatPenalty": 1.1
}
```

---

### Qwen2.5-0.5B-Instruct (Q4_K_M)

```
Size:  ~350 MB
RAM:   768 MB minimum
Speed: 14-24 tok/s (modern phones)
```

| Pros | Cons |
|------|------|
| Surprisingly smart for 0.5B | Slightly slower than SmolLM2-360M |
| Excellent instruction following | Needs more RAM |
| Good personality range | Qwen-specific chat template |
| Multilingual (if needed) | |

**Best for:** Users who want richer conversations and don't mind slightly slower responses.

**Personality prompt effectiveness:** ⭐⭐⭐⭐ — Excellent. Follows complex character instructions well.

---

## 🟡 Tier 2: Good Alternatives

### TinyLlama-1.1B-Chat (Q4_K_M)

```
Size:  ~700 MB
RAM:   1.5 GB minimum
Speed: 7-11 tok/s (modern phones)
```

| Pros | Cons |
|------|------|
| Real personality depth | Noticeably slower |
| Good long-term coherence | Needs ~1.5GB free RAM |
| Llama 2 architecture (well-supported) | May struggle on older phones |
| Large community, well-tested | |

**Best for:** Users with flagship phones who want the most personality-rich experience.

**Personality prompt effectiveness:** ⭐⭐⭐⭐ — Holds character across long conversations. Good emotional nuance.

**⚠️ RAM note:** Ensure at least 1.5GB free RAM before loading. Close background apps.

---

### Phi-3-mini-4k-instruct (Q4_K_M)

```
Size:  ~2.1 GB
RAM:   4 GB minimum
Speed: 3-6 tok/s (iPhone 15 Pro / flagship Android)
```

| Pros | Cons |
|------|------|
| Near ChatGPT-3.5 quality | Very large for mobile |
| Excellent reasoning | Slow on most phones |
| Great personality depth | Only works on latest flagships |
| | Battery drain during inference |

**Best for:** Cutting-edge flagship phones only. iPhone 15 Pro or newer, Galaxy S24, Pixel 8+.

**Personality prompt effectiveness:** ⭐⭐⭐⭐⭐ — Astoundingly good. Feels like a real conversation.

**⚠️ Not recommended as default** — most phones can't run this comfortably.

---

## 🟠 Tier 3: Experimental

### Gemma-2-2B (Q4_K_M)

```
Size:  ~1.4 GB
RAM:   3 GB minimum
Speed: 4-5 tok/s (iPhone 15 Pro)
```

- Excellent conversation quality
- Gemma architecture — needs specific prompt format
- May have issues with older llama.cpp versions
- **Status**: Community tested on 3 devices, needs more validation

### StableLM-Zephyr-3B (Q3_K_M)

```
Size:  ~1.8 GB
RAM:   4 GB minimum
Speed: 2-4 tok/s (flagship only)
```

- Great personality, very chatty
- Zephyr tuning makes it naturally conversational
- Very slow on all but the fastest phones
- **Status**: Experimental, only tested on iPhone 15 Pro

### OpenELM-270M-Instruct (Q4_K_M)

```
Size:  ~180 MB
RAM:   384 MB minimum
Speed: 25-35 tok/s
```

- Apple-designed for on-device
- Good for Apple Silicon
- Less community support
- Strange prompt format requirements
- **Status**: Works but finicky

---

## 🔴 Tier 4: Not Recommended

| Model | Why Not |
|-------|---------|
| Llama-3-8B | Too large (4-6GB Q4). Won't fit on any phone comfortably. |
| Mistral-7B | Same — 7B parameter models are desktop/server models. |
| Any FP16 model | 2x size of Q8_0 with minimal quality gain for chat. |
| Non-chat tuned models | Base models (no instruct/chat tuning) won't follow the Tamagotchi persona. |
| Falcon architecture | Not fully supported by llama.cpp mobile builds. |
| DPO/RLHF tuned models | Often have safety refusals that break the Tamagotchi illusion. |

---

## How to Pick Your Model

```
"Do you have a flagship phone (iPhone 14+, Galaxy S23+)?"
  ├─ YES → "Do you want the best personality?"
  │         ├─ YES → TinyLlama-1.1B or Qwen2.5-0.5B
  │         └─ NO → SmolLM2-360M (fast, reliable)
  └─ NO → "Is storage very limited?"
            ├─ YES → SmolLM2-135M (tiny, always works)
            └─ NO → SmolLM2-360M (best all-rounder)
```

---

## Benchmark Methodology

All benchmarks run on real devices with:

- **App state**: Clean launch, no background apps
- **Battery**: > 50%
- **Prompt**: 20-turn conversation (mix of short/long messages)
- **Context window**: 2048 tokens
- **Measurement tool**: `llama-perf` logging + device temperature monitoring

### Metrics measured

| Metric | Method |
|--------|--------|
| **tok/s** | Tokens generated / wall clock time (streaming) |
| **TTFT** | Time to first token after prompt processing |
| **RAM peak** | Xcode Instruments (iOS) / Android Profiler |
| **Battery drain** | % battery / 100 tokens generated |
| **Thermal state** | iOS `ProcessInfo.processInfo.thermalState` / Android Thermal API |

---

## Contributing Benchmarks

Found a model that works well? Ran benchmarks on a device we haven't tested? Please contribute!

1. Run the benchmark script: `npm run benchmark -- --model=/path/to/model.gguf`
2. Fill out the template in `benchmarks/template.md`
3. Submit a PR with your results

Include: device model, OS version, RAM, model quantization, and any quirks you noticed.

---

## Model Sources

All Tier 1-3 models are available from trusted Hugging Face uploaders:

- [HuggingFace.co/bartowski](https://huggingface.co/bartowski) — SmolLM2, Qwen2.5 quants
- [HuggingFace.co/TheBloke](https://huggingface.co/TheBloke) — TinyLlama, older models
- [HuggingFace.co/MaziyarPanahi](https://huggingface.co/MaziyarPanahi) — Phi-3, Gemma

The app includes pre-configured download URLs to the specific quantization files.
