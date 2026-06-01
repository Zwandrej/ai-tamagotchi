# On-Device LLM Guide

## Architecture

The app uses `llama.rn` — a React Native binding for `llama.cpp` — to run LLM inference directly on the device.

```
User Message → ChatScreen → AIService.generateResponse()
  → build prompt (creature state + history)
  → llama.rn completion()
  → processConversationTurn() (sentiment, happiness, memory)
  → UI update
```

## Model Selection

Models are selected at creature creation from a curated catalog:

| Model | Size | RAM Needed | Notes |
|---|---|---|---|
| Apple On-Device | built-in | N/A | iOS native ML |
| TinyLlama 1.1B | 0.6 GB | 2 GB | Fast, good personality |
| Llama 3.2 1B | 0.7 GB | 2 GB | Latest Meta |
| Gemma 2 2B | 1.4 GB | 4 GB | Best conversation |
| Phi-2 2.7B | 1.6 GB | 4 GB | Surprisingly smart |

## Download

Models are downloaded from HuggingFace via `react-native-fs` to the app's document directory. Downloaded models persist until explicitly deleted.

## Initialization

```typescript
const context = await initLlama({
  model: modelPath,
  n_ctx: 2048,
  n_batch: 512,
  n_threads: 2,
});
```

Loading takes 10-30 seconds for a 1B model. The context remains in memory until the app is terminated.

## Prompt Structure

Each inference call builds a system prompt containing:
- Creature species, name, stage, branch
- Personality traits, mood, mood intensity
- Current stats (hunger, happiness, energy, hygiene)
- Recent memory tags
- Conversation history (last 10 messages)
- User's current message

## Template Fallback

If no model is loaded, the app falls back to template-based responses via `ModelManager.generateTemplateResponse()`. These are mood-aware but limited.

## Adding New Models

Add an entry to `MODELS` array in `ModelManager.ts`:

```typescript
{
  id: 'model-id',
  name: 'Display Name',
  size: '1.4 GB',
  minRAM: '4 GB',
  quant: 'Q4_K_M',
  url: 'https://huggingface.co/.../resolve/main/model.gguf',
  description: 'Short description',
}
```
