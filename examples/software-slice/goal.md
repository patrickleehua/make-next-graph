# Rank public story metadata

Deliver a small, usable story-ranking function and an executable example.
Use specification files from the selected method at their original paths.

Acceptance:

- Keep only live, non-deleted `story` records with positive safe integer IDs and finite scores.
- Sort by descending score; equal scores use ascending ID. Default to at most five records.
- Accept a nonnegative integer limit, including zero; reject other limits with RangeError.
- Reject a non-array collection with TypeError.
- Do not reorder, modify or clone the input records; return a new array.
- Write the behavioral tests first. Show an actual assertion failure against the
  starter, implement the behavior, then run the same tests and the example.

The data is a small synthetic metadata fixture. This software slice tests behavior;
the separate web-digest example proves live API access.
