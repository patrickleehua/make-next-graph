---
name: make-next-graph
description: Plan and resume artifact-producing tasks using make-style dependencies. Use when work benefits from reusable intermediate results or continuation from files, alone or with Goal, SDD and TDD. Skip trivial tasks without useful intermediates.
license: MIT
metadata:
  version: "0.1.0"
  runtime: "Node.js 22 or newer for optional helpers."
---

# Make Next Graph

Model inspectable results as nodes: sources, specifications, code, checks, analysis
or delivery. The graph records dependencies; recompute observations from real files
without maintaining a parallel status list. Reuse valid results, produce the next
useful result, verify it and reassess the goal.

## Start or resume

1. Read the goal, observable acceptance and constraints. On resume, read the existing
   graph and relevant artifacts before starting new work.
2. Work backward from the deliverable using real dependencies. Select the smallest
   useful template: `research`, `software` or `content`. Adapt its paths and acceptance;
   add industry intermediates when they improve the result. Keep native tool outputs
   at their original paths.
3. Inspect the graph with the helper, or manually when it is unavailable. Read actual
   inputs and acceptance before choosing useful work from the suggestions.
4. Produce the result with authorized native tools; verify and recompute after a
   meaningful result or change. Recipes and `ready` are advice, not execution permission.
5. Read the actual result against the goal before delivering. `evidence-ready` means
   referenced files and expected process results are available; `semanticAcceptance`
   remains `not-evaluated`.

```text
node <skill-dir>/scripts/make.mjs init --template research --out <task-dir>/graph.json
node <skill-dir>/scripts/make.mjs next <task-dir>/graph.json --root <task-dir> --json
```

The optional helper requires Node.js 22+, with no package installation, provider,
database or network. Paths resolve from `--root`, defaulting to the graph directory.
`init` refuses overwrite; `next` is read-only. Use repeated `--spec` options to bind
original SDD files; see [methods.md](references/methods.md) when composing methods.

## Handle uncertainty and change

- Missing external inputs wait for their source. Unreadable, empty or malformed
  evidence is unknown; an unavailable process is unverified; a nonmatching exit
  code is a failure. Preserve these differences and continue independent work.
- Repair a failed check's actual cause. Do not repeat an unchanged failure, invent
  passing evidence or weaken acceptance. A meaningful TDD red identifies missing
  behavior: implement it even if the source file already exists. File presence does
  not establish a complete implementation or a sound specification.
- Newer prerequisites produce impact hints. Read the substantive change before
  deciding whether to revise downstream work. Timestamps are not proof of invalidity;
  equal timestamps do not prove consistency either.
- Revise dependencies when needed, recording a useful `changeReason` or review note.
  Reuse valid results; do not reset the task or manufacture bookkeeping.
- A planner fault does not erase facts. Repair the definition or continue from the
  goal and artifacts with native tools, keeping real dependencies and verification.

## Longer tasks and parallel work

The host owns execution, wakeups, budgets, cancellation and permissions. Assign a
native agent its inputs, output paths and acceptance. Dependency-independent
candidates may still overlap writes or side effects; the host coordinates these.

On restart, reread the goal and artifacts. With no useful action, report the missing
input, unknown result or decision and yield. Preserve user pauses and host permissions.
Retry a side effect only with actual execution evidence and its retry/idempotency
contract; the graph cannot prove whether an external action finished exactly once.

## Read only what is needed

- Defining nodes, raw checks or command output: [graph-format.md](references/graph-format.md).
- Adding a reusable industry graph: [extend.md](references/extend.md).
- Combining TDD, SDD or a host goal loop: [methods.md](references/methods.md).
- Editor/tool validation: [graph.schema.json](references/graph.schema.json).

Keep this whole folder portable. The method and helper do not depend on another
skill or a particular agent product.
