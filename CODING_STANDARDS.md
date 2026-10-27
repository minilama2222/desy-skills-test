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

## Domain language comes from the glossary

When the diff names a domain concept, it uses the term as `GLOSSARY.md` defines
it. A new synonym for an existing term, or a term used in the sense the glossary
marks `_Avoid_:`, is a finding. If the concept is genuinely missing, the diff
adds it to the glossary rather than letting the reader infer it.

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

The fixture that dominates this repo is the scaffold copy in `createSandbox`
(~85 MB / 5.260 files per sandbox), so a regression there shows up here first.
When a test's budget trips, profile the fixture before raising the ceiling.

