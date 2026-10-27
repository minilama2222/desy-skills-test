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

### Windows shell noise

On Windows, `npm test` / `npm run precommit` and `git commit` can exit 1 because
vitest writes to stderr, which PowerShell reads as `NativeCommandError`. The work
succeeded; confirm with `git log` / `git status`, don't re-run to "fix" it.

PowerShell has no heredoc: `git commit -F -` with a `<<'EOF'` body fails to parse,
and the retry mangles the accents. Write the message to a file and pass
`git commit -F <ruta>`.

