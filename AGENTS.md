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
skill-vs-check.** The rest is a grep away (`renderInformeCaso`, `escribirInformesPorCaso`).

### The commit hook runs the whole gate

`scripts/git-hooks/pre-commit` calls `npm run precommit` and nothing else. Add a
step to `package.json`, never to the hook: a hook that repeats the list drops a
step in silence, and it already did (retro del ticket 06).

### The gate exits 0 or 1, and nothing else

`npm run precommit` (and the commit hook) runs the suite through `test:gate`,
which reproduces vitest's exit code with both channels piped. Take the exit code
as the verdict: read the `failed` count, not the terminal.

A visible stderr block does not decide it. `test:gate` filters vitest's channels,
but the other `verificar-*` steps and the CLI writing `usage()` print to stderr
outside it, so a commit can show one and still be green. The check that settles
it: the commit exists (`[master <sha>]`) or it does not — `set -e` in the hook
means a real failure leaves no commit behind.

PowerShell has no heredoc: `git commit -F -` with a `<<'EOF'` body fails to parse,
and the retry mangles the accents. Write the message to a file and pass
`git commit -F <ruta>`.

### Tests that drive a real process, and what may live in `test/`

See `docs/agents/testing.md`.

