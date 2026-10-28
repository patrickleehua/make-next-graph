# Add an industry graph

Keep the evaluator generic. New business knowledge belongs in results, dependencies,
acceptance text and recipes. It should not require another enum in the calculator.

## Start from the reusable packs

`assets/templates/content.json` composes three fragments:

```text
goal
 ├─ research.sources → research.findings ─┐
 └─ content.audience ────────────────────┤
                                        ↓
                         content.draft → content.review → content.delivery
```

This is a working non-software template. The research fragment is shared by the
standalone research template and the content template. `next` reads this composition
directly; `init --template content` creates a flattened editable task definition.

For a different industry, name the important intermediate outputs. A data-analysis
task might need a dataset description, a quality report and an analysis notebook;
a manufacturing proposal might need constraints, a calculation and a feasibility
review. These are examples of modeling choices, not certified industry procedures.
Use qualified IDs such as `data.quality` to keep independent packs composable.

## Add one useful intermediate

Suppose a report now requires a data-quality review. After initializing a task,
add a node to its existing `nodes` array:

```json
{
  "id": "data.quality", "title": "Source data quality", "kind": "artifact",
  "requires": ["research.sources"], "files": ["analysis/data-quality.md"],
  "acceptance": "Describe missing values, sampling limits and their effect on the report's conclusions.",
  "recipe": {
    "instructions": "Inspect the actual source data and record consequential limitations.",
    "role": "data-analyst", "writes": ["analysis/data-quality.md"]
  }
}
```

Add `data.quality` to the final report node's `requires`, then validate and recompute.
The new gap becomes visible. Existing outputs remain untouched; read their content
to decide which conclusion needs revision. Do not create a second producer for an
existing output or mark the whole task incomplete by deleting valid work.

## Turn the result into a pack

Move reusable nodes to a fragment document containing `version: 1` and `nodes`.
Include it from a template with `includes: ["fragments/data-quality.json"]`.
Keep all included files under the top graph's directory tree. Files remain relative
to the chosen task workspace, not to the fragment's location.

Composition adds definitions; it does not patch or override included node IDs.
To alter an existing node, flatten with `init` and edit the task graph, or revise
the template source deliberately. Keep shared packs immutable during an active task
unless that task intentionally adopts the update. This prevents a template update
from silently changing an already instantiated task.

Before accepting a contributed pack, check that its outputs are useful, acceptance
is inspectable, source/permission requirements are clear, and its happy path and one
failure/resume path work. Avoid private source snapshots, internal paths, credentials,
company-specific role lists and blanket promises of regulatory compliance.
