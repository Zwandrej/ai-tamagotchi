export { createCreature, restoreCreature, performCare, ageCreature, processConversationTurn, exportWidgetState } from './creatureEngine';
export type { WidgetState } from './creatureEngine';
export { generateDNA, expressTraits, nudgeTraits, addMemory, exportDNA, importDNA, validateDNA, DNAValidationError } from './dna';
export { buildSystemPrompt, buildPrompt, buildCarePrompt, buildIdleThoughtPrompt, formatHistory } from './promptBuilder';
export { renderCreature, renderCreatureFace, renderStatBar, describeTraits, describeTrait } from './asciiRenderer';
