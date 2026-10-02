"""InvMut Document 3 — test verification.

Given a reference P, a modified M, and a candidate test T (contract `InvMutTest`), decide whether
T's single assertion is PROVED on P and REFUTED at that assertion on M (→ accepted), using ESBMC
unmodified in the locked Doc-3 mode: `--bound --k-induction --max-k-step 10 --solidity-max-tx 1`
driving ONLY the test contract (never `--contract C`; `commands.build_doc3_*`). The failure-location
oracle (§6) is mandatory: a FAILED counts as a real property violation ONLY when the failed claim is
the test's own final assert — C's own asserts are off-target → inconclusive.
"""
