# Coding standards

Rules for the **reviewer agent** when it reviews a diff. The repo's automated
guardrails (typecheck, tests, the pre-commit hook) need no rule here: they run on
their own, and a rule that a check already enforces pays load to say nothing.

These are the judgements no guardrail can make.

## Claim only what is built and measured

A diff says what it did. The reviewer's job is to check that the *claim* matches
the *evidence in front of it*:

- **A checkbox, a `done` status, or an ADR that asserts a behaviour must point at
  something that exists.** When the criterion depends on work that is not built
  yet (a consumer that does not exist, a pipeline not written), the honest state
  is *partial*: leave it unchecked and name who completes it. Marking it done
  turns the ticket into a lie that the next reader trusts.
- **A decision that rests on a measurement is not settled until the measurement
  exists.** ADRs that fix a quantitative policy (a threshold, an N, a ratio)
  carry the measurement that justifies it, or say plainly that it is not yet
  validated. A rule written from intuition and left unmarked reads as settled.

The failure this prevents has happened twice in this repo: a ticket marked `done`
whose acceptance criterion depended on an unbuilt scorecard, and an ADR whose
numeric rule only survived because the first run contradicted it.

The same claim lives in the `README.md`'s usage block, and no guardrail can read
it: whether `npm run report` "aggregates results" depends on the prose next to the
command, not on the command existing. The mechanical half of this rule — a ticket
`done` with an open checkbox — is enforced by `npm run verificar-tracker`, and the
README's declared Caso count by `npm run verificar-readme`; the prose half is
yours to check against the CLI's own `usage()`.

Two commands lists exist and they are not the same list: `src/cli.ts`'s `usage()`
covers the CLI **subcommands** (`run`, `report`, `capturar-gold`, `bump-pin`…),
while the README's `## Uso` block documents the **npm scripts**. A script that is
not a CLI subcommand (e.g. `capturar-mockup`, `verificar-captura-gold`) belongs
in the README and *not* in `usage()`; comparing the two for a script is a false
finding.

## A test of a "must not" is written with the adverse scenario whole

A criterion that says *this must not happen* — "without invoking the skill, the
report cites no section", "a Caso that never delivered is not SUSPENDE" — is only
tested when the test carries the full adversarial setup, **including the parts
that would make the bug visible**.

The failure this prevents happened in the ticket-06 build: the criterion was "a
run that invoked no skill cites no section", and the test injected a reader that
returned `undefined` for every section. That reader made the section unreadable
for *every* run, so it hid the real bug — the code consulted the reader *before*
checking for invocation — and the test went green over a broken criterion. The
review found it by asking what the test would do with the real reader.

So:

- **Never stub away the thing that fails.** If the scenario is "the tree has the
  section but the run invoked nothing", the test's tree must *have* the section.
  A double that returns empty is the bug's alibi, not its proof.
- **Pair it with a positive control**: the same input, with the condition that
  lifts the prohibition, *does* produce the forbidden thing. Without the control,
  a green may be a test that could never have failed ("control of that an anchor
  does read when there is invocation").
- **Check it goes red first.** Before the fix, the new test must fail; run it
  against the old code if the fix is already in. A test written after the fix and
  never seen red is a claim, not a check.

The tell: ask *"what would I have to break for this test to go red?"*. If the
answer is "nothing I did", the test does not cover the criterion.

## Domain language comes from the glossary

When the diff names a domain concept, it uses the term as `GLOSSARY.md` defines
it. A new synonym for an existing term, or a term used in the sense the glossary
marks `_Avoid_:`, is a finding. If the concept is genuinely missing, the diff
adds it to the glossary rather than letting the reader infer it.

A **name** says what it counts. A field, a local or a rendered column carries
the glossary's word for the thing it holds: `entregas` for deliveries,
`intentos` for attempts, and `ejecuciones` only where it means the Ejecución
objects themselves. The two are not synonyms: an Ejecución is an attempt, and
only some attempts deliver. One name covering both is a finding even when the
number under it is right. (The ticket 03 turned the budget from attempts into
deliveries; it did not retire the rule, it made it matter.)

## A decision-Caso's Guard is the positive decision

In a **Caso-decisión** (see ADR-0011), the no-negociable fact — the thing whose
absence sinks the Grade — is the **positive declaration of the correct value**:
the SUT identified this component, chose this template, recommended this
library. Two patterns must **not** be Guards:

- **A mentionable negative.** A `no_declara_decision` as a Guard sinks a correct
  answer that *names the forbidden value while rejecting it* ("this is not a
  `header-advanced`"). When the SUT could legitimately name the value, the
  negative is a **Quality**.
- **A vocabulary-dependent label.** In a recognition task the fact is the
  **component** ("is it a button?"), not its variant label ("is it `primary`?"):
  the catalog is representative, not exhaustive, and the skill's own linter
  treats "undocumented" as a warning, not an error. The variant is a **Quality**,
  and its assert is tolerant (asks "is this the variant?" against the catalog,
  not "does the literal match?"). The same holds for a label that is **not a
  component variant**: the category of a discrepancy (`bloqueante`, which
  `desy-design-match` writes as `🔴 bloqueante`), the name of a size, the wording
  of a verdict. The non-negociable fact is the **thing** — the row is reported,
  the check is named — and the label is the Quality.

The tell: if you cannot say *"a correct answer could never contain this string"*,
it does not belong in a Guard.

**Anchoring Spanish with accents.** The grader normalises text without accents
(`normalizarTexto`), so a value it searches for loses `é`/`í`/`ó`. Where the form
matters — the pretérito `cloné` versus the imperative `clone`, which only the
tilde distinguishes — search the **raw** text. There, `\b` does not work: `\w` is
`[A-Za-z0-9_]`, so an accented vowel is not a word character and `\b` after it is
no boundary (`/\bcloné\b/` never matches `cloné`). Anchor with a lookahead
instead: `clon[ée](?![a-záéíóúñ])`. See `RECLAMACIONES_EJECUCION` in
`src/grader.ts`.

## A macro Caso-componente measures the HTML around the macro

A Caso-componente grades the **source** the SUT writes into `src/`, unexpanded
(ADR-0006). So its tokens and its markup facts come from the HTML the artifact
actually contains:

- **Tokens of a macro call.** The macro's `classes` is a Nunjucks string
  (`"classes": "mt-base"`): it is invisible to `tokens-del-sistema` /
  `espaciado_del_sistema` until the macro expands, which a Caso-componente never
  does. A token Quality on a macro Caso is only measurable when the artifact also
  writes **real HTML** with those utilities (a wrapper `<div class="mt-base
  mb-base">`). If the whole artifact is one macro call, the token checks pass
  vacuously — a spec-fitting golden, not a measurement. Either require the HTML
  wrapper in the prompt, or drop the token Quality.
- **a11y over tags.** `fieldset_con_legend` and `labels_visibles` look for
  `<fieldset>` / `<label>` **tags**, which do not exist in a macro call's source.
  These Guards belong to a Caso that writes markup (`caso-pagina`, or a
  layout Caso whose artifact is HTML) — not to a macro-based Caso-componente. A
  `sin_props_inventados` on the macro *is* measurable (it reads the props
  literal), so it stays.

The tell: a token or markup Guard is measurable only if the string it greps for
is present in the artifact the Caso actually grades.

## A Bloque's Casos get one acceptance test file

Casos added together as a **Bloque** (a group of skills worked in one ticket) share
one acceptance test file named for the block — `test/casos-bloque-a.test.ts`,
`test/casos-bloque-b.test.ts` — with a `describe` per Caso. The file fixes that a
correct artifact gives EXCELENTE and that each specific error sinks it or drops a
Quality; the golden evidence is transcribed as the SUT produces it, not as a
restatement of the Gold. A Caso built as a **slice** (a single vertical path, like
`boton-primario` or `patron-pagina-paso-1`) keeps its own `<caso>.test.ts`. The
tell: a ticket that adds several Casos for one block wants one block file; a
ticket that lands one Caso wants one Caso file.

## A test that drives a real process carries its own time budget

A test that spawns the CLI, or copies the scaffold, pays a cost that grows with
the size of the fixture, not with the logic it asserts. A test costing 60 s per
run reads as "integration tests are slow" and stays that way: nothing fails, the
CI just gets heavier. So such a test asserts **its own duration** against a
stated ceiling (`SEGUNDOS_POR_EJECUCION` in `test/suite-cli.test.ts`), with the
measured baseline in the comment. The tell: if you cannot say what the number is
and why, you do not know whether a change made it worse.

Count the units **from the run**, never from a literal. Since the budget is per
attempt, the attempt count has to come from what happened (`corrida.vistas`), not
from what the test expected: a `--n 2` whose delivery fails runs up to the hard
cap, so a test that wrote `2` got four copies of the scaffold against a budget
for two and passed only on fast days. The count and the cost are two checks: the
`expect(corrida.vistas)` fixes how many attempts there should be, the budget
fixes what each one may cost.

The fixture that dominates this repo is the scaffold copy in `createSandbox`
(~85 MB / 5.260 files per sandbox), so a regression there shows up here first.
When a test's budget trips, profile the fixture before **measuring against the
copy**: the count is a share of one Execution, not the whole of it, so a budget
expressed as "a copy × K" says nothing. Measure the parts (copy, `tsx` start,
grader) and compare the same test isolated against the full suite. A budget that
only trips in the suite is **contention, not the code**: fix where it competes
(`maxWorkers` in `vitest.config.ts`), not the ceiling.

## A test that needs the repo's own state redirects it

A test that writes to a directory the product also uses (`reports/`, a cache, a
config file) **redirects** that directory to its own temp. The failure this
prevents happened in the ticket-09 build: two test files renamed the real
`reports/versiones/` and put it back in a `finally`. Each passed alone, and under
parallel workers one saw the directory another had moved mid-run, plus a crash
could leave the maintainer's tree changed.

The redirect is an environment variable the module reads at startup
(`DESY_VERSIONES_DIR` in `src/reportes.ts`), passed down to any child process the
test spawns. The tell: if the test has a `finally` whose job is to put the repo
back, it is touching state it does not own. With the redirect the repo is never
changed, so there is nothing to restore.

## A `.gitignore` exception hangs off `*`, never off a bare directory

A negation (`!reports/versiones/`) cannot reopen a directory that an earlier
pattern ignored **as a directory** (`reports/`, `/reports/`): git does not
descend into it, so it never reaches the negation. The `.gitignore` entry that
works is `/reports/*` then `!/reports/versiones/`, and the assertion that guards
it asks git (`git check-ignore`) rather than restating the pattern.

The same holds for the next exception: an ignored-and-reopened tree (`versiones`,
then `legado`) hangs off the `*` line and gets its own `!` line above the one
that closes the block. The tell: if `git status` does not list a file the pattern
says is tracked, the pattern is the suspect, not git.


## A sandbox is `cwd` *and* `PWD`, and isolation is asserted on the artefact

`spawnSync({ cwd })` moves a child's real working directory but leaves the
inherited **`PWD`** untouched, and tools resolve relative paths against `PWD`. So
a runner that sets only `cwd` looks isolated and is not: `write src/x.html`
lands in the launcher's directory. Measured with `opencode` 2.2.1 — same sandbox,
same env, only `PWD` changed, and the file moved (ADR-0019).

The rule that follows is about what a test **asks**, not only what the product
sets. Assert the artefact's location — *the file is under `workDir`, and the repo
gained no untracked file* — and not the plumbing that was supposed to put it
there. A check on `opts.cwd` and on a list of env keys passed while every real
run wrote into the repo (retro del ticket 16); it answered "did I pass the cwd?"
when the claim was "will the SUT write inside the sandbox?". The tell: a check
that goes green when the mechanism is swapped for a different one, because it
never observed the outcome.
