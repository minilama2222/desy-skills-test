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
`done` with an open checkbox — is enforced by `npm run verificar-tracker`; the
prose half is yours to check against the CLI's own `usage()`.

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
  not "does the literal match?").

The tell: if you cannot say *"a correct answer could never contain this string"*,
it does not belong in a Guard.

