"""InvMut Document 2 — mutation-candidate validation pipeline.

Stages 0-5 (Doc 2 §0.2): exact-change dedup, build+compile, format check, duplicates
pre-filter, R1 safety, R2 observational differential. ESBMC is used UNMODIFIED; this package
only assembles inputs (a mutant file, an R2 harness) and classifies ESBMC's output via
`invmut.esbmc.parse`. Locked ESBMC modes live in `invmut.esbmc.commands` (R2 = --bound, the
binary-measured correction to Doc 2 §6.1's --unbound; see notes/DEVIATIONS.md#V1).
"""
