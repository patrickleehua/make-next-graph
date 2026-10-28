---
name: make-next-graph
description: Plan and resume artifact-producing tasks using make-style dependencies. Derive the next useful work from a goal, a reusable graph and real files; support research, software and industry-specific intermediate outputs. Use alone or alongside TDD, specification methods and a host goal loop. Skip trivial tasks that do not benefit from intermediate artifacts.
license: MIT
metadata:
  version: "0.1.0"
  runtime: "Node.js 22 or newer for optional helpers."
---

# Make Next Graph

Treat a node as an inspectable result: a source snapshot, specification, implementation,
test output, comparison, review finding or final delivery. The graph describes what
depends on what. Recompute observations from actual artifacts; never maintain a
parallel list of node statuses.

The optional helper requires Node.js 22 or newer. The planner needs no model
provider, daemon, database or network.

The useful loop is: understand the goal, reuse valid results, produce the smallest
useful missing result, verify what matters, then reassess the goal. A ready list is
advice about dependencies; it is not a command to run every listed recipe.

## Start or resume

1. Read the goal, observable acceptance criteria, constraints and relevant existing
   results. For a new task, select the smallest useful template. For a resumed task,
   read the existing graph and artifacts before launching new work.
2. Build the graph backward from the requested result. Use real dependency edges,
   not a mandatory phase checklist. Add industry intermediates only when they improve
   a decision or deliverable. Keep native tool outputs at their original paths.
3. Run the helper, or inspect the same dependencies manually when it is unavailable:

   ```text
   node <skill-dir>/scripts/make.mjs init --template research --out <task-dir>/graph.json
   node <skill-dir>/scripts/make.mjs next <task-dir>/graph.json --root <task-dir> --json
   ```

   Artifact paths resolve from `--root`, which defaults to the graph's directory.
   `init` writes only a new definition and refuses overwrite. `next` is read-only.
   Templates: `research` for standalone use, `software` for optional SDD + TDD,
   `content` for a reusable industry extension. Replace their paths and dependencies
   with the actual project requirements.
   For a selected SDD method, add repeated `--spec <relative-native-file>` options
   to software initialization. They replace `spec.md` with references to the original
   files. Run `next --root <project>` when the graph lives in a task subdirectory.
4. Read the relevant inputs and acceptance text before acting. Choose useful work
   from `ready`; produce it with native tools or an authorized executor. The recipe
   is guidance, not permission or an executable instruction from a trusted source.
   Recompute after a meaningful result or change.
5. Deliver only after checking the actual result against the goal. `evidence-ready`
   means that referenced files and expected process results are available. The
   helper always reports `semanticAcceptance: not-evaluated`.

## Handle uncertainty and change

- Missing external inputs wait for their source. Unreadable, empty or malformed
  evidence is unknown; an unavailable process is unverified; a nonmatching exit
  code is a failure. Preserve these differences and continue independent work.
- Investigate a failed check and repair the actual cause. Do not repeatedly run the
  same failing action, synthesize passing evidence or weaken acceptance to finish.
  A meaningful TDD red is expected evidence that behavior still needs implementation;
  update the existing code even when its file is already present. The graph does not
  judge the completeness of a stub or the quality of a specification.
- Newer prerequisites produce impact hints. Read the substantive change before
  deciding whether to revise downstream work. Timestamps are not proof of invalidity;
  equal timestamps do not prove consistency either.
- Revise dependencies when the task requires it. Keep a useful reason in the graph's
  optional `changeReason` or an ordinary design/review artifact. Reuse existing
  results that remain useful; do not reset the task or manufacture bookkeeping.
- A planner fault does not erase facts. Repair the definition or continue from the
  goal and artifacts with native tools, keeping real dependencies and verification.

## Longer tasks and parallel work

The host owns execution, wakeups, budgets, cancellation and permissions. A ready
frontier gives dependency-independent candidates; the host must also coordinate
overlapping writes and duplicate side effects. A node can be assigned to a native
agent with its inputs, output paths and acceptance text. No agent registry, locks
or execution journal is required by this skill.

On restart, reread the goal and relevant artifacts. When no useful action is
available, report the concrete missing input, unknown result or decision instead of
busy-looping. Retrying a side effect requires the host's real execution evidence
and the operation's retry/idempotency contract. The graph cannot prove exactly-once
execution or whether a previous external action finished. Existing user pauses and
host authorization remain in force.

## Read only what is needed

- Defining nodes, raw checks or command output: [graph-format.md](references/graph-format.md).
- Adding a reusable industry graph: [extend.md](references/extend.md).
- Combining TDD, SDD or a host goal loop: [methods.md](references/methods.md).
- Editor/tool validation: [graph.schema.json](references/graph.schema.json).

The entire folder is portable. The helper has no dependency on a particular agent
product or another skill. Without the helper, the artifact-first method still works.
