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

`npm run suite` and `npm run report` write `reports/<tree>/informe/<skill>/<caso>.md`
alongside the Scorecard. The renderer is `renderInformeCaso` in `src/informe.ts`
(pure: Executions + a `ContextoDelCaso`); the adapter that resolves the skills
tree and writes the files is `escribirInformesPorCaso` in `src/cli.ts`. A Caso
anchors each Check to a skill section in its `rubric.md` (`## Anclaje en
desy-skills`), cited by title via `src/seccion-skill.ts`; `npm run verificar-casos`
checks the titles exist. The report presents; it never decides skill-vs-check.

### Windows shell noise

On Windows, `npm test` / `npm run precommit` and `git commit` can exit 1 because
vitest writes to stderr, which PowerShell reads as `NativeCommandError`. The work
succeeded; confirm with `git log` / `git status`, don't re-run to "fix" it.

That only holds for **noise**: an exit 1 with no `FAIL` / `Test Files … failed`
line is the stderr false alarm. A `failed` count is a **real failure** — read it
and fix it; do not write it off as the noise case. (The framing above once nearly
had a real red dismissed as noise.)

PowerShell has no heredoc: `git commit -F -` with a `<<'EOF'` body fails to parse,
and the retry mangles the accents. Write the message to a file and pass
`git commit -F <ruta>`.

### Substituting an external binary in a test

Yes, when a test must drive a real process (e.g. measuring a CLI's exit code).
Don't reach for `PATH`: on Windows `spawn` reads only the `Path` key (an injected
`PATH` is ignored in silence and the **real** binary answers), a sibling `.exe`
beats a `.cmd`, and a `.cmd` by absolute path isn't launched without `shell`.
Inject a prelude instead — a file run via `NODE_OPTIONS=--require` that wraps
`child_process.spawn`, keyed on the command name — and have the double leave a
per-run mark the test asserts on, so a fake that never ran fails instead of
passing green. The working fixture is `test/suite-cli.test.ts`; the guardrail that
enforces the allowlist is `npm run verificar-tests`.

