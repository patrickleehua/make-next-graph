# A small Goal + specification + TDD + make example

The same story-ranking contract can use a plain acceptance document, native OpenSpec
change files, or native Spec Kit feature files. There is no extra adapter runtime.

Use an isolated task workspace. Copy these files into it:

| This example | Task workspace |
|---|---|
| `goal.md` | `goal.md` |
| `goal.md` | `spec.md` for the plain method only; SDD users keep their original specifications. |
| `tests/acceptance.test.mjs` | `tests/acceptance.test.mjs` |
| `starter.mjs` | `src/feature.mjs` |
| `try.mjs` | `try.mjs` |

Initialize a graph, then run commands from the task workspace. Replace `<skill-dir>`
with the path to the portable skill directory:

```text
node <skill-dir>/scripts/make.mjs init --template software --out graph.json
node <skill-dir>/scripts/make.mjs next graph.json --json
node <skill-dir>/scripts/record.mjs checks/red.json -- node --test tests/acceptance.test.mjs
```

The red command intentionally exits `1`. Read its real assertions: they show missing
ranking behavior. The starter imports successfully, so this is not an environment
or import failure. A graph only observes files, so a stub may appear present; the
host must still implement the behavior identified by the tests and specification.

Implement `src/feature.mjs` yourself, or copy this example's `feature.mjs` there to
inspect the completed tutorial. Keep the test expectations unchanged:

```text
node <skill-dir>/scripts/record.mjs checks/green.json -- node --test tests/acceptance.test.mjs
node try.mjs
node <skill-dir>/scripts/make.mjs next graph.json --json
```

The same four tests pass. The real executable returns `{"rankedIds":[8,2,9]}`.
After reading the results against the goal, write the actual delivery summary in
`delivery.md`. Preserve the red result; it is evidence of the TDD step, not a failure
to relabel. Regroup or add graph nodes only if that helps the current task.

For OpenSpec or Spec Kit, create and author the specification through the selected
method's own tools first, then bind the relevant original files when initializing:

```text
node <skill-dir>/scripts/make.mjs init --template software --spec openspec/changes/rank-stories/specs/ranking/spec.md --spec openspec/changes/rank-stories/tasks.md --out graph.json
```

Or pass `--spec specs/001-rank-stories/spec.md --spec specs/001-rank-stories/plan.md
--spec specs/001-rank-stories/tasks.md`. Use the real feature paths in that project.
There is no second `spec.md` to keep synchronized. The generic graph does not parse
task checkboxes as test evidence or claim to have executed a slash command.

The repository regression suite runs the complete plain tutorial offline. The
verification record separately describes actual native SDD initialization and
checks. The tutorial uses synthetic metadata; live API access is demonstrated by
the separate web-digest example.
