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

## Domain language comes from the glossary

When the diff names a domain concept, it uses the term as `GLOSSARY.md` defines
it. A new synonym for an existing term, or a term used in the sense the glossary
marks `_Avoid_:`, is a finding. If the concept is genuinely missing, the diff
adds it to the glossary rather than letting the reader infer it.
