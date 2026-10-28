# Public web digest

Produce a usable, linked Markdown digest from up to five current top items using
the [official Hacker News API](https://github.com/HackerNews/API). Retain a stable
snapshot, rank returned live stories by score and count their source hosts.
Exclude deleted, dead and non-story items. A lower returned count is disclosed.

Each item must include its title as returned, score, original URL when available
and a discussion link. Record retrieval time and live/fixture mode. Read only
public metadata; do not summarize unseen article bodies or treat scores as quality.
The check verifies consistency of saved artifacts, not article truth or live links.

The two analysis outputs depend on the same snapshot and may be produced
independently. Restarting the example must reuse completed files and must not
silently fetch a new snapshot. Use another output directory for a new edition.
