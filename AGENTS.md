# Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Token authority

`desy-styles-reference` is the source of truth for spacing/colour tokens (`base`
= 1rem, not `4`; `p-base`, not `p-4`). Where an implement-* skill's own example
contradicts it (e.g. `gap-x-4` in `desy-implement-layout-patterns`), the reference
wins and the example is the legacy to catch. See the `## A macro Caso-componente…`
rule in `CODING_STANDARDS.md`.

### The per-Caso report

`npm run suite` and `npm run report` also write `reports/<tree>/informe/<skill>/<caso>.md`.
The rule that outlives the code: **the report presents, it never decides
skill-vs-check.**

### The commit gate

The list of steps lives in `package.json` (`npm run precommit`); the hook runs it
whole. Add a step there, never to the hook (retro del ticket 06). A commit that
exists is a green gate: the hook is `set -e`.

PowerShell has no heredoc: write the message to a file and pass `git commit -F <ruta>`.

### Tests that drive a real process, assert sandbox isolation, and what may live in `test/`

See `docs/agents/testing.md`.

