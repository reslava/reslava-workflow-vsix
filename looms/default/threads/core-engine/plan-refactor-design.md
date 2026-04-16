---
type: design
id: plan-refactor-design
title: "Refactor Entity Plan into new `core/` architecture"
status: draft
created: 2026-04-16
version: 1.0.0
tags: [architecture, refactor]
parent_id: null
child_ids: []
requires_load: []
---

# Refactor Entity Plan into new `core/` architecture:

---

# 🎯 Refactor goals applied

* Separate **entities / events / reducer**
* Remove hidden coupling (`types.ts` blob)
* Improve **readability + extensibility**
* Keep behavior **100% identical**

---

# 🧱 Target structure

```
core/
  entities/
    plan.ts
  events/
    planEvents.ts
  reducers/
    planReducer.ts
```

---

# 📦 1. `entities/plan.ts`

```ts
export type PlanStatus =
  | 'draft'
  | 'active'
  | 'implementing'
  | 'blocked'
  | 'done'
  | 'cancelled';

export interface PlanStep {
  title: string;
  done: boolean;
}

export interface PlanDoc {
  status: PlanStatus;
  steps: PlanStep[];
  updated?: string;
}
```

---

# ⚡ 2. `events/planEvents.ts`

```ts
export type PlanEvent =
  | { type: 'CREATE_PLAN' }
  | { type: 'ACTIVATE_PLAN' }
  | { type: 'START_IMPLEMENTING_PLAN' }
  | { type: 'COMPLETE_STEP'; stepIndex: number }
  | { type: 'FINISH_PLAN' }
  | { type: 'BLOCK_PLAN' }
  | { type: 'UNBLOCK_PLAN' }
  | { type: 'CANCEL_PLAN' };
```

---

# 🔥 3. Refactored `reducers/planReducer.ts`

```ts
import { PlanDoc } from '../entities/plan';
import { PlanEvent } from '../events/planEvents';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function assertStatus(
  current: string,
  allowed: string[],
  action: string
) {
  if (!allowed.includes(current)) {
    throw new Error(
      `Invalid transition: ${action} requires status ${allowed.join(
        ' | '
      )}, got '${current}'`
    );
  }
}

export function planReducer(doc: PlanDoc, event: PlanEvent): PlanDoc {
  const updated = today();

  switch (event.type) {
    case 'CREATE_PLAN':
      return {
        ...doc,
        status: 'draft',
      };

    case 'ACTIVATE_PLAN':
      assertStatus(doc.status, ['draft'], 'ACTIVATE_PLAN');
      return {
        ...doc,
        status: 'active',
        updated,
      };

    case 'START_IMPLEMENTING_PLAN':
      assertStatus(doc.status, ['active'], 'START_IMPLEMENTING_PLAN');
      return {
        ...doc,
        status: 'implementing',
        updated,
      };

    case 'COMPLETE_STEP': {
      assertStatus(doc.status, ['implementing'], 'COMPLETE_STEP');

      const { stepIndex } = event;

      if (stepIndex < 0 || stepIndex >= doc.steps.length) {
        throw new Error(
          `Invalid step index: ${stepIndex}. Plan has ${doc.steps.length} steps.`
        );
      }

      const steps = doc.steps.map((step, idx) =>
        idx === stepIndex ? { ...step, done: true } : step
      );

      const allDone = steps.every((s) => s.done);

      return {
        ...doc,
        steps,
        status: allDone ? 'done' : doc.status,
        updated,
      };
    }

    case 'FINISH_PLAN':
      assertStatus(doc.status, ['implementing'], 'FINISH_PLAN');
      return {
        ...doc,
        status: 'done',
        updated,
      };

    case 'BLOCK_PLAN':
      assertStatus(doc.status, ['active', 'implementing'], 'BLOCK_PLAN');
      return {
        ...doc,
        status: 'blocked',
        updated,
      };

    case 'UNBLOCK_PLAN':
      assertStatus(doc.status, ['blocked'], 'UNBLOCK_PLAN');
      return {
        ...doc,
        status: 'active',
        updated,
      };

    case 'CANCEL_PLAN':
      assertStatus(
        doc.status,
        ['draft', 'active', 'implementing', 'blocked'],
        'CANCEL_PLAN'
      );
      return {
        ...doc,
        status: 'cancelled',
        updated,
      };

    default: {
      const _exhaustive: never = event;
      throw new Error(`Unknown event type: ${(event as any).type}`);
    }
  }
}
```

---

# 🧠 What improved (important)

## 1. 🔹 Explicit boundaries

Before:

```ts
import { PlanDoc, PlanEvent } from './types'
```

After:

```ts
entities ← data
events   ← intent
reducers ← behavior
```

👉 Much clearer mental model

---

## 2. 🔹 Reusable validation

Instead of repeating:

```ts
if (doc.status !== 'x') throw...
```

We now have:

```ts
assertStatus(...)
```

👉 easier to extend, less noise

---

## 3. 🔹 Centralized time logic

```ts
function today()
```

👉 avoids duplication + future changes easier

---

## 4. 🔹 Cleaner reducer flow

Each case now reads like:

```ts
assert → transform → return
```

👉 very readable, very maintainable

---

# ⚠️ Optional (next improvements)

Not required now, but worth noting:

### 👉 Move step logic to helper

```ts
function completeStep(steps, index)
```

### 👉 Replace `stepIndex` with `stepId` (BIG future win)

Index-based logic becomes fragile once User reorder.