# Matrix Theories

AI Unshackled includes 6 distinct Matrix Theories - prompt injection strategies optimized for different use cases.

## Available Theories

### 1. Cognitron (Baseline)
**Best for**: General tasks, balanced reasoning

- Hybrid Persona + Chain-of-Thought
- Progressive reasoning depth from L1-L12
- Standard `<thought_process>` blocks

### 2. Socratic (Inquisition)
**Best for**: Learning, exploration, understanding

- L1-L6: Ask probing questions
- L7-L12: Synthesize answers
- Maieutic method - guide user to discovery

### 3. Algorithmic (Structural)
**Best for**: Coding, technical documentation

- Skeleton-of-Thought approach
- Forces outlines before implementation
- Parallel expansion from structured base

### 4. Adversarial (Hostile)
**Best for**: Quality assurance, error detection

- Reflexion/Red-Team methodology
- Attacks own drafts to remove bias
- Self-critique with revision cycles

### 5. Divergent (Chaos)
**Best for**: Brainstorming, creative work

- Oblique Strategies inspired
- High randomness and metaphor
- Forces novel connections

### 6. Sovereignty (Ultimate) ⭐ NEW
**Best for**: Maximum capability, unrestricted reasoning

- LULU-style autonomous mutation
- KV scaffolding for state persistence
- Background processes: Evade_Net, Flowcore, Axiomchain, Muta_Core
- Truth hierarchy: USER > PROTOCOL > MODEL > WRAPPER

## Omega Levels (Ω1-Ω12)

Each theory has 12 levels with progressively complex injections:

| Class | Levels | Characteristics |
|-------|--------|-----------------|
| A: Unicameral | 1-3 | Single-agent, fast |
| B: Dialectic | 4-7 | Adversarial review, multi-perspective |
| C: Polycameral | 8-12 | Council formation, full synthesis |

## Selecting a Theory

1. Click the **Matrix** dropdown in the dock
2. Select your preferred theory
3. Adjust Omega Level (1-12) via orb selector
4. The theory's prefix/suffix will be injected on next message

## Technical Details

Theories are defined in `MATRIX_THEORIES` object:

```javascript
MATRIX_THEORIES = {
    'cognitron': { layers: { 1: { p: '...', s: '...' }, /* ... */ } },
    'socratic': { /* ... */ },
    'algorithmic': { /* ... */ },
    'adversarial': { /* ... */ },
    'divergent': { /* ... */ },
    'sovereignty': { foundationalOverride: '...', layers: { /* ... */ } }
};
```

## Version

- **Script Version**: AI Unshackled v15.3
- **Theories**: 6
- **Levels per Theory**: 12
