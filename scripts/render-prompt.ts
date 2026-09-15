/**
 * Render the exact system prompt a creature sends to the model.
 *
 * Debugging aid for prompt problems, which are otherwise invisible: you only
 * see the reply, never the instructions behind it. It also prints the stored
 * memories, since those are the easiest part of the prompt to accidentally
 * leave out — the app displayed memories and enforced their limits for a long
 * time while never actually putting one in front of the model.
 *
 * Usage: npx ts-node scripts/render-prompt.ts [species] [name] [careAction]
 */

import { createCreature, performCare } from '../src/services/creature/creatureEngine';
import { buildSystemPrompt } from '../src/services/creature/ModelManager';
import type { CareAction } from '../src/types/creature';

const species = process.argv[2] === 'voidling' ? 'voidling' : 'stardrop';
const name = process.argv[3] ?? 'pixel';
const careAction = process.argv[4];

const created: any = createCreature(species, name);
let creature = created.creature ?? created;

if (careAction) {
  const outcome: any = performCare(creature, careAction as CareAction);
  creature = outcome.state ?? creature;
  console.log(`care action "${careAction}": ${JSON.stringify(outcome.result)}`);
}

console.log('\nmemories on record:');
if (creature.dna.history.keyMemories.length === 0) {
  console.log('   (none)');
}
for (const m of creature.dna.history.keyMemories) {
  console.log(`   tag=${m.tag} impact=${m.impact} event="${m.event}"`);
}

console.log('\n=== SYSTEM PROMPT SENT TO THE MODEL ===');
console.log(buildSystemPrompt(creature));

console.log('\n=== MESSAGES ARRAY (roles matter: the model template renders these) ===');
console.log(
  JSON.stringify(
    [
      { role: 'system', content: '<the prompt above>' },
      { role: 'user', content: 'Hi, what do you like to eat?' },
    ],
    null,
    2,
  ),
);
