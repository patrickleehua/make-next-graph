# Graph format v1

A graph is a JSON document. Nodes describe real files. No `status`, completion
percentage, fingerprint, executor lease or run ID belongs in the definition.

```json
{
  "version": 1,
  "name": "A small report",
  "goals": ["report"],
  "nodes": [
    {
      "id": "brief", "title": "User brief", "kind": "input",
      "files": ["goal.md"],
      "acceptance": "The requested result and its acceptance criteria are clear."
    },
    {
      "id": "report", "title": "Report", "kind": "artifact",
      "requires": ["brief"], "files": ["report.md"],
      "acceptance": "Answer the brief with traceable sources and stated limitations.",
      "recipe": { "instructions": "Research, write and read back the report.", "role": "analyst", "writes": ["report.md"] }
    }
  ]
}
```

## Definition contract

| Field | Meaning |
|---|---|
| `version` | Exactly `1`; breaking contract changes need a new version. |
| `name`, `description` | Task name and optional purpose. |
| `goals` | Nonempty target IDs; observation includes their transitive prerequisites only. |
| `nodes` | Local node definitions; unique IDs, no dependency cycles. |
| `includes` | Optional relative JSON fragments under the graph's directory. Fragments contain `version`, `nodes`, optional `description` and `includes`. |
| `changeReason` | Optional human-readable explanation of a definition change; not a state transition. |
| Node `kind` | `input`: externally supplied result, no recipe. `artifact`: produced result. `check`: raw process result. |
| Node `files` | One or more explicit regular files. All must be nonempty and readable. Directories and wildcards are unsupported. |
| Node `requires` | Prerequisite IDs; omitted means none. |
| Node `acceptance` | Observable business or professional acceptance in plain text, assessed by the agent/person. |
| Node `recipe` | Required for produced nodes: `instructions`, optional `role`, `command` and `writes`. These are advisory text and write-scope hints. |
| Node `check` | Check nodes only: `path` must be in `files`; `expectExitCode` defaults to `0`. |

Paths use `/` or `\` separators, remain within the chosen workspace and avoid
Windows device names. Existing symlinks escaping that root are unknown, not read.
`includes` also stays within the definition's directory tree and never loads code
or fetches a URL. Repeated inclusion of the same fragment is deduplicated; distinct
definitions with the same node ID or output producer are rejected. Use one producer
per output. Schemas check shape; the helper additionally checks edges, paths and
composition. Maximums are 1,000 composed nodes and 64 distinct definition files.

Source files can stay in their existing locations under `--root`. A code node can
name several actual source files. This first version does not discover arbitrary
repository changes, expand globs or verify source revisions. Choose relevant
explicit files and inspect the real changes with the project's tools.

## Derived observations and suggestions

| Fact | Meaning | Suggested handling |
|---|---|---|
| `present` | Every referenced file is readable and nonempty; a check matches its expected exit code. | Read content and acceptance; presence alone does not prove quality. |
| `missing` | At least one file does not exist, without an unknown observation. | Produce the result when prerequisites are usable, or obtain the missing input. |
| `unknown` | Permission failure, empty file, directory, malformed check, escaped path or other observation failure. | Inspect the specific evidence; do not treat it as absent or passed. |
| `failed` | A real process exit code does not match the expected code. | Investigate the original output and repair the cause. |
| `unverified` | A check has no process exit code, for example a timeout or unavailable dependency. | Obtain the missing verification conditions; preserve the gap. |

`usable` is a dependency calculation: own fact is present and all prerequisites
are usable. An existing final file cannot hide an unavailable required input.
`ready` lists missing produced nodes or failed checks whose prerequisites are usable.
`attention` lists unknown evidence and possible upstream impacts; `waiting` explains
missing external inputs and blocked dependencies. Independent ready work remains
visible even if a different branch has failed or cannot be observed.

`possiblyAffectedBy` uses newest upstream and oldest downstream modification times,
plus transitive impact hints. It is advisory only. Changes to recipe text, dependency
meaning, or file content with preserved times cannot be detected this way. Branch
switches and copied files can produce misleading hints. Read the goal, graph and
actual content; no automatic invalidation or content-addressed cache is implemented.

`status` is `needs-work`, `needs-attention` for unknown/unverified observations, or
`evidence-ready` when the selected target closure is usable. Impact hints can coexist
with `evidence-ready` and still need judgment. `semanticAcceptance` is always
`not-evaluated`. These values are printed on demand and never persisted by the helper.

## Raw checks

Keep the original command's result together; do not add a second approval receipt:

```json
{ "exitCode": 0, "stdout": "actual command output\n", "stderr": "" }
```

An unavailable or interrupted command uses `exitCode: null` plus a useful `reason`.
Arbitrary prose and missing logs cannot be guessed into a pass. A JSON check record
is limited to 4 MiB; keep very large original logs as separate named artifacts and
use a focused command for the summarized check. The helper reads the record but
cannot authenticate who ran it or whether its scope proves the business goal.

The optional `record.mjs` helper explicitly invokes a native executable, captures
its exit code/stdout/stderr and returns the same exit code:

```text
node <skill-dir>/scripts/record.mjs checks/green.json -- node --test tests/acceptance.test.mjs
```

This command is a separate process-capture utility; `next` never calls it. It uses
no shell expansion, times out after 120 seconds and marks launch errors, signals,
timeouts or output truncation as unverified. Output capture is limited to 256 KiB
per stream; the retained JSON also fits the reader when output needs escaping.
Keep larger full logs separately. Calling it again replaces that output
file; select separate paths when prior results are worth retaining, as with TDD's
red and green results. The recording path is relative to the current directory,
so run the command from the intended workspace. Use executable programs rather
than shell built-ins or Windows `.cmd` shims.

## CLI

```text
node <skill-dir>/scripts/make.mjs init --template content --out work/task/graph.json
node <skill-dir>/scripts/make.mjs validate work/task/graph.json
node <skill-dir>/scripts/make.mjs next work/task/graph.json --root work/task --json
node <skill-dir>/scripts/make.mjs next work/task/graph.json --goal research.findings
node <skill-dir>/scripts/make.mjs mermaid work/task/graph.json
```

`init` flattens included definitions into a portable, editable graph. It does not
create fake results or overwrite an existing graph. `next` defaults `--root` to the
graph's directory. It exits `0` when observation succeeds, including when work remains;
parse the JSON for automation. Exit `2` means invalid input or a top-level IO error.
There is no `run`, `mark-done`, agent launcher, polling service or database.

For the software template, repeat `--spec <relative-file>` to replace its default
`spec.md` reference with files owned by the selected specification method. The
binding is checked before initialization writes anything; duplicate, escaping or
inapplicable bindings are rejected. These references do not have to exist yet when
the task is initialized: their actual presence is observed by `next`. No SDD tool
is invoked and no same-purpose copy is created. Other templates do not use `--spec`.
