export { createCreature, createFromDNA, restoreCreature, performCare, ageCreature, processConversationTurn, exportWidgetState } from './creatureEngine';
export type { WidgetState } from './creatureEngine';
export { generateDNA, expressTraits, nudgeTraits, addMemory, exportDNAString, buildDNAExport, importDNA, validateDNA, DNAValidationError, applyEpigenetics } from './dna';
export { buildSystemPrompt, buildPrompt, buildCarePrompt, buildIdleThoughtPrompt, formatHistory } from './promptBuilder';
export { renderCreature, renderCreatureFace, renderStatBar, describeTraits, describeTrait } from './asciiRenderer';
