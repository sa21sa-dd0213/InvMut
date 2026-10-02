"""Doc-prompts §8–§12 — the four prompts (mutation A/B, test C/D), their system lines, the three
mutation GOAL variants, the §7 DIFFERENCE rendering, and the reflection diagnosis blocks.

Faithful to InvMut-prompts-and-memory.md, with ONE implemented deviation (DEVIATIONS V27 / codex F5):
Prompt C/D carry an explicit FLAT-SHAPE constraint (top-level c-calls only) so the LLM does not emit
nested/aliased/helper calls that the Doc-3 V26 completeness guard rejects as malformed_test — which would
silently burn the 5-attempt test budget. The spec already implies it ("interact only through c", "exactly
one public function holds all the logic"); we make it explicit."""

from __future__ import annotations

import re

SYS_MUTATION = ("You modify a Solidity contract. You make one small change so that a chosen, externally "
                "visible behavior of the contract differs from the original.")
SYS_TEST = ("You write a Solidity test contract. Its assertion must be a general rule that the original "
            "contract satisfies and a given modified version breaks.")

# §6.1 GOAL — one per observation category. `f`/`v` are filled from the Doc-1 target.
def goal_state(fn: str, var: str, kind: str = "scalar", key: str = "k") -> str:
    if kind == "mapping":
        return (f"after a call to `{fn}(...)` completes, the value of `{var}` differs at some key `{key}` "
                f"that the checker chooses: `P.{var}({key}) != M.{var}({key})` — the differing key need "
                f"not be the caller's own")
    if kind == "balance":
        return f"after a call to `{fn}(...)` completes, the value of `address(this).balance` differs"
    return f"after a call to `{fn}(...)` completes, the value of state variable `{var}` differs: " \
           f"`P.{var}() != M.{var}()`"


def goal_return(fn: str) -> str:
    return (f"a call `{fn}(args)` that completes (does not revert) in both P and M, but returns different "
            f"values: the return value of `P.{fn}(args)` differs from that of `M.{fn}(args)`")


def goal_revert(fn: str) -> str:
    return f"a call `{fn}(args)` on which exactly one of P and M reverts while the other completes"


_PROMPT_A = """Here is a Solidity contract P:
{CONTRACT_CODE}

Produce a strong and non-equivalent mutant M of P that differs by exactly one single-statement edit \
— rewrite, delete, insert, or move one statement (a reorder is one move, not two edits) — made only \
inside the body of one of these units:
{EDITABLE_UNITS}

The edit must lead to an observable behavioral difference. That is, running the original P and your \
mutant M from the same initial state with the same calls and arguments, there must exist a call \
sequence on which {GOAL}.

Keep every function name, parameter list, return list, and visibility unchanged; add or \
remove no function, state variable, or import. You MAY add, remove, or change a modifier \
invocation on a function (e.g. drop an `onlyOwner` / `nonReentrant` guard); M must compile.

Do not repeat any of these edits:
{MUTATION_MEMORY}

Do not edit these already-handled statements; choose a different one:
{AVOID_STATEMENTS}

Respond with one JSON object and nothing else:
{{
  "unit_id": "<the id, e.g. U001, of the one unit you edited>",
  "operation": "replace | insert | delete | move",
  "change_summary": "<one sentence; for a move, name the statement and its old and new position>",
  "mutated_unit_code": "<the full source of that unit after your edit>"
}}"""

# Pro-arm test-writing notes (config.test_prompt_notes): prepended to the prompt source like the ABI
# block; mechanical facts about the verifier model / harness, no case knowledge.
TEST_NOTES = """// TEST-WRITING NOTES (read before writing InvMutTest):
// 1. Every call you make on c has msg.sender == address(this) (the test contract). To set up state that
//    belongs to an account (balance, allowance, ownership, a deposit), use address(this) as that account
//    and make the setup calls yourself first (e.g. c.approve(spender, x) then c.transferFrom(address(this), to, x)).
// 2. Solidity RESERVED WORDS you must NOT use as identifiers: after, before, alias, apply, auto, case, copyof,
//    default, define, final, implements, in, inline, let, macro, match, mutable, null, of, partial, promise,
//    reference, relocatable, sealed, sizeof, static, supports, switch, typedef, typeof, var.
// 3. Use the EXACT signatures listed in the PUBLIC SURFACE block (argument count, order, types, payability).
// 4. In the assert, avoid subtraction that can underflow (e.g. before - amount): require(amount <= before)
//    first, or compare with + on the other side.
// 5. ORDER inside the function: (a) require(...) on input parameters only; (b) the setup calls that create the
//    state (approve/deposit/transfer/...); (c) read the before-values from c; (d) the deciding call; (e) one assert.
//    Never require() a condition on c's state before the call that creates it: from a fresh deployment it is
//    false and every path dies.
// 6. Write NO reasoning comments in the code; output the contract directly.
// 7. This test contract DEPLOYED c, so it usually holds the privileged role (owner / admin / CEO / depositor).
//    A check on msg.sender therefore passes for you and looks identical on P and M. To observe an
//    access-control difference, FIRST hand the role to another address taken as a parameter through c's own
//    public function (transferOwnership / setOwner / renounce ...), THEN make the deciding call, and assert on
//    its revert flag. If no such function exists, observe the effect of the privileged call instead.// 8. c has ONLY the members listed in the PUBLIC SURFACE block: a state variable that is not declared `public`
//    has NO getter (c.owner() does not exist unless listed). Never guess a name; if you need a fact that has no
//    getter, establish it yourself through c's public functions instead of reading it.
// 9. Shape: the contract is `contract InvMutTest` with `C c;`, a constructor `constructor(C _c) { c = _c; }`, and
//    ONE public function `run(...)`. Every state-changing call is a plain top-level statement `c.f(args);` or
//    `try c.f(args) { reverted = false; } catch { reverted = true; }`. NO low-level call, NO abi.encodeWithSignature,
//    NO address(c).call, NO helper functions, NO loops, exactly ONE assert(...).
// 10. Execution model: the verifier deploys a FRESH C and executes your run(...) exactly ONCE as a single
//     transaction; msg.sender is the InvMutTest contract for every call and there is NO prior transaction
//     history. All setup must be inline calls at the top of run(...) — a property that needs a different
//     sender, a prior deposit "from another account", or state carried across separate invocations of
//     run(...) can never be proven and the attempt is wasted.
"""

# §9 Prompt B diagnosis blocks (mechanical failures only)
_B_DIAG = {
    "did_not_compile": ("Your previous change did not compile. The compiler reported:\n{COMPILER_ERROR}\n"
                        "Fix this while still making exactly one single-statement edit from the original."),
    "format_error": ("Your previous change was not a single edit in one allowed unit: {FORMAT_REASON}. "
                     "Make exactly one single-statement edit in exactly one listed unit."),
}

_FLAT_SHAPE = (
    "- Every call that CHANGES c's state must be its own TOP-LEVEL statement in the single public "
    "function (`c.f(args);` or `x = c.f(args);`) — never nested inside an if/for/while/try, never inside "
    "a require/assert, and never reached through a helper function, an alias, a cast, or an interface. "
    "Only read-only (view/pure) calls on c may appear inside require/assert."
)

_PROMPT_C = """Here is a Solidity contract P ({CONTRACT_NAME}), shown FOR REFERENCE ONLY — it already \
exists in the compilation unit. Do NOT copy or re-declare it in your output:
{CONTRACT_CODE}

And a mutant M that changes one statement:
{CHANGE}

The full changed version of that unit is:
{MODIFIED_UNIT_CODE}

On the calls below, the two versions behave differently:
{DIFFERENCE}

These concrete values are one example of a call sequence on which P and M differ.

Your task is to write a generalized test that holds on P and is violated by M. Fill in the template so \
that its single assert states a general rule over the input parameters — one that holds on P for all \
inputs and is broken by M. The rule must capture the underlying condition that separates P from M, not \
the example numbers above, and it need not mention the differing variable directly. The call statements \
below are PRE-FILLED in the exact order the counterexample used — keep that order and only choose the \
arguments; add a require precondition if P needs one (otherwise leave it `true`), then end with exactly \
one assert that reads the resulting observation.

contract InvMutTest {{
    {CONTRACT_NAME} c;
    constructor({CONTRACT_NAME} _c) {{ c = _c; }}
    function run(/* params */) public payable {{
{RUN_BODY}
    }}
    receive() external payable {{ /* optional callback logic, if needed — e.g. re-enter c here to test a reentrancy difference */ }}
}}

Constraints:
- Output ONLY the single contract named exactly InvMutTest. Do NOT define, copy, or re-declare \
{CONTRACT_NAME} or ANY other contract, interface, or library — they already exist in the compilation \
unit. Do NOT emit any pragma line or SPDX-License-Identifier comment. Your source is appended AFTER the \
existing code, so re-declaring {CONTRACT_NAME} (or repeating pragma/SPDX) causes an "identifier already \
declared" compile error and your test is discarded.
- Exactly one public function holds all the test logic. You may also define only a constructor, a \
receive, and a fallback. No other functions.
- Declare a state variable c of type {CONTRACT_NAME}, take it in the constructor, and interact only \
through c.
- Use input parameters; do not hard-code values.
- If Ether is needed, the function may be payable and may call c.f{{value: amount}}(...), with amount \
from a parameter, plus require(address(this).balance >= amount). Use Ether transfer or `receive` only \
when the confirmed difference requires it.
- Observe c ONLY through its PUBLIC/EXTERNAL surface: the auto-generated getters of its `public` state \
variables, its `public`/`external` view/pure functions and their return values, `address(c).balance` \
(value held by c) and `address(this).balance` (value received by the test), and revert booleans. Do NOT \
read ANY other member of c. A `private`/`internal` state variable has NO getter — writing `c.<name>(...)` \
for it (e.g. `c.balances(addr)`) causes a `Member "<name>" not found or not visible` compile error and \
your test is discarded. If the rule seems to need a non-public variable, re-express it through an \
observable effect instead: a public function's return value, a revert, or `address(c).balance`.
- End with exactly one assert(<condition>): a formula over the parameters, values read/returned from c \
through that public surface, and any revert booleans. Not a constant, not a literal-vs-literal comparison, \
not assert(true).
- No cheatcodes (no vm.*), hard-coded addresses, new deployments, or randomness.
{FLAT_SHAPE}

These rules were already tried for this difference; do not repeat them:
{TEST_MEMORY}

Respond with one JSON object and nothing else:
{{
  "property_summary": "<one short sentence stating the general rule>",
  "test_code": "<the Solidity source of the InvMutTest contract ONLY — no pragma, no SPDX, no other contract/interface definitions>"
}}"""

# no_tt ablation (USER 2026-06-28): "no test template". Front-end (oracle ① + CE) is UNCHANGED, but the
# test prompt drops the fill-in scaffold (_run_body_scaffold) and the literal `contract InvMutTest {...}`
# template — the model must synthesize the whole parameterized contract itself. CRUCIAL (codex Q2): the
# canonical HARD CONSTRAINTS that the ESBMC assembler (verify/assemble.py + canonical.py) requires are
# KEPT verbatim — they are oracle ②'s input contract, not scaffolding. Goal: isolate the scaffold's
# call-placement/reasoning value, "aggressive but FAIR" — still steer toward a compiling, assemblable
# contract (USER: "至少尽量让他生成足够编译的东西"). The DIFFERENCE prose (the CE) is still shown.
_PROMPT_C_MINIMAL = """Here is a Solidity contract P ({CONTRACT_NAME}), shown FOR REFERENCE ONLY — it \
already exists in the compilation unit. Do NOT copy or re-declare it in your output:
{CONTRACT_CODE}

And a mutant M that changes one statement:
{CHANGE}

The full changed version of that unit is:
{MODIFIED_UNIT_CODE}

Write a generalized test contract named exactly InvMutTest that HOLDS on P and is VIOLATED by M. You \
design the whole contract yourself: declare the parameters, drive c through its public surface in \
whatever order is needed, and end with a single assert stating a GENERAL rule over the parameters — one \
that holds on P for all inputs and is broken by M. The rule must capture the underlying condition that \
separates P from M, and it need not mention the differing variable directly.

To make this both DISTINGUISHING and machine-CHECKABLE (a verifier proves it holds on P and is broken by M):
- TARGET THE CHANGE: make the rule about exactly the behaviour M's one-statement edit changes (a rule that \
also holds on M is useless). If reaching the deciding state needs prior calls, write them as concrete \
top-level `c.<fn>(...)` statements IN ORDER before the deciding call.
- KEEP IT SHORT: drive c with the FEWEST calls needed — the verifier explores only a short bounded \
transaction sequence, so a long setup makes it unable to decide (inconclusive).
- KEEP THE RULE SIMPLE: ONE comparison over c's observed values and the parameters (e.g. a getter/return \
vs an expression of the inputs, or a revert boolean). Avoid loops, heavy arithmetic, or several chained \
conditions — they push the verifier to "inconclusive".

HARD RULES — a violation makes your test compile-fail or be discarded, so follow them exactly:
- Output ONLY one contract named exactly InvMutTest. Do NOT define, copy, or re-declare {CONTRACT_NAME} \
or any other contract/interface/library — they already exist in the compilation unit. Emit NO pragma and \
NO SPDX comment (your source is appended AFTER the existing code; re-declaring causes an "identifier \
already declared" error).
- Declare a state variable `c` of type {CONTRACT_NAME}, take it in `constructor({CONTRACT_NAME} _c) {{ \
c = _c; }}`, and interact ONLY through `c`. You may define ONLY this constructor, exactly ONE \
public/external function holding ALL the test logic, and optionally a receive and a fallback. No other \
functions, and the logic function must carry no modifier.
- Use input parameters of the logic function to drive calls/values; do not hard-code the example values. \
Do NOT read msg.value in the body — if Ether is needed, take the amount as a parameter and call \
c.f{{value: amount}}(...) with require(address(this).balance >= amount).
- Observe c ONLY through its PUBLIC/EXTERNAL surface: auto-generated getters of `public` state variables, \
`public`/`external` view/pure return values, `address(c).balance`, `address(this).balance`, and revert \
booleans. A `private`/`internal` variable has NO getter — reading `c.<name>(...)` for it is a compile \
error. If the rule needs a non-public variable, re-express it through an observable effect (a public \
return value, a revert, or a balance).
- End with EXACTLY ONE assert(<condition>): a real formula over the parameters, values read/returned from \
c through that public surface, and any revert booleans. Not a constant, not literal-vs-literal, not \
assert(true). A precondition may be expressed with require(...); a read-only (view/pure) call on c may \
appear inside require/assert, but every STATE-CHANGING call on c must be its own top-level statement.
- No cheatcodes (no vm.*), hard-coded addresses, new deployments, or randomness.
{FLAT_SHAPE}

These rules were already tried for this difference; do not repeat them:
{TEST_MEMORY}

Respond with one JSON object and nothing else:
{{
  "property_summary": "<one short sentence stating the general rule>",
  "test_code": "<the Solidity source of the InvMutTest contract ONLY — no pragma, no SPDX, no other contract/interface definitions>"
}}"""

# §11 Prompt D diagnosis blocks (+ the V26/V27 malformed_test branch, codex F5)
_D_DIAG = {
    "did_not_compile": ("Your previous test did not compile: {COMPILER_ERROR}. Fix it without weakening "
                        "the rule."),
    "wrong_form": ("Your previous test had the wrong shape: {FORM_REASON}. Keep exactly one public "
                   "function with all the logic, plus at most a constructor, a receive, and a fallback."),
    "uses_msg_value": ("Your previous test read msg.value inside the function body. Remove it: "
                       "msg.value is not reliably defined inside a called function. If you need to check "
                       "the test's available Ether budget, use a parameter instead "
                       "(e.g. require(address(this).balance >= amount)). "
                       "Keep the same rule and the same assert; only remove the msg.value read."),
    "malformed_test": ("Your previous test was rejected by the shape checker: {FORM_REASON}. "
                       "Every state-changing call on c must be its OWN top-level "
                       "statement — not nested in if/for/while/try, not inside require/assert, and not "
                       "through a helper, alias, cast, or interface. Rewrite it in that flat shape, "
                       "keeping the same rule."),
    "not_parameterized": ("Your previous test used only fixed numbers, or its parameters were unused. "
                          "Rewrite it so a parameter actually drives a call, a value, a require, or the "
                          "assert."),
    "trivial_assertion": ("Your previous assertion was constant or always true. Replace it with a real "
                          "rule relating the parameters and c's values."),
    "inconclusive": ("The checker could not settle whether P satisfies your rule. Add or strengthen the "
                     "require(...) preconditions to narrow the inputs, keeping the same rule."),
    "fails_on_original": ("Your previous rule does not hold on P; it already fails before any change: "
                          "{ORIGINAL_FAIL}. Weaken or correct the rule so P always satisfies it."),
    "holds_on_modified": ("Your previous rule is not broken by M. Using the difference above, strengthen "
                          "or retarget the rule so M violates it."),
    # precise mechanical diagnoses (config.precise_test_diags, DeepSeek Pro arm 2026-09-07): the generic blocks
    # below mis-steer a small model — "add preconditions" when its own precondition already killed every
    # path, or nothing at all when its own arithmetic trapped before the assert.
    "m_no_cex_dead_path": ("The checker found NO execution that even reaches your assert on M: from a fresh "
                           "deployment every path stops at one of your require(...) statements or at a "
                           "revert inside c. Typical cause: a require on c's state (allowance, balance, "
                           "owner, deposit, a flag) placed BEFORE the call that establishes it, or a state "
                           "that this test contract never set up. Every call you make has "
                           "msg.sender == address(this): set the state up yourself with top-level calls on "
                           "c using address(this) as the account, THEN read the before-values, THEN make the "
                           "deciding call. Keep require(...) only on the input parameters."),
    "non_target_failure": ("On M the run trapped BEFORE your assert, at {FAIL_WHERE}. This is not the rule "
                           "being violated. If the trap is in your own code it is most often an arithmetic "
                           "underflow/overflow (e.g. `before - amount` when the value is 0) or an out-of-range "
                           "cast: rewrite the assert without the risky arithmetic (compare with `+` on the "
                           "other side, or require(amount <= before) right before the assert). Keep the same "
                           "rule."),
    "m_no_cex_within_bound": ("The checker did not find any inputs that break your rule on M, within its "
                              "search depth. That makes your rule too weak to catch the fault — not too "
                              "input-restricted. Strengthen or retarget the rule so M violates it; do not "
                              "just add or tighten preconditions, since that would shrink the inputs the "
                              "checker considers and would not help."),
}


def _run_body_scaffold(call_sequence: list | None, category: str | None,
                       during_call: bool = False, observer_getter: str | None = None) -> str:
    """The run() body as FILL-IN pseudocode (DEVIATIONS V30 / icse.tex:835). The counterexample's
    diverging path IS the call order the test must reproduce, and a multi-call path (e.g. TOD
    deposit->setRewardRate->claim) is easy to miss from prose alone — so pre-place the ordered calls
    as concrete `c.<fn>(...)` statements; the agent only chooses arguments + the general rule. GENERAL,
    not TOD-specific: any CE-derived sequence (state/return/revert), and a single-call boundary whose
    difference needs a re-entrant callback drives the `receive()` scaffold (reentrancy). An empty
    sequence (e.g. an R1 runtime-safety difference with no harness wrappers) falls back to a generic
    skeleton. The explicit `require(... otherwise leave true)` mirrors the `receive()` scaffold: a slot
    the agent fills only if P needs a precondition."""
    seq = [c["function"] if isinstance(c, dict) else c for c in (call_sequence or [])]
    out = ["        require(/* fill in a precondition if P needs one, otherwise leave */ true);",
           "        // To send Ether, take the amount as a PARAMETER (e.g. `uint amount`) and call",
           "        // c.f{value: amount}(...); NEVER read msg.value here. If you do, require",
           "        // address(this).balance >= amount first."]
    if seq:
        for name in seq[:-1]:
            out.append(f"        c.{name}(/* args, incl. {{value: amount}} if payable */);   // establish the state the difference needs")
        boundary = seq[-1]
        if category == "return":
            out.append(f"        /* returnType */ obs = c.{boundary}(/* args */);   // boundary: declare the return type and capture the returned value as the observation")
        elif category == "revert":
            out.append(f"        bool reverted; try c.{boundary}(/* args */) {{ reverted = false; }} catch {{ reverted = true; }}   // boundary")
            out.append("        // This is a REVERT difference: state the rule over `reverted` and the")
            out.append("        // parameters ONLY. Do NOT read c's internal variables — they may be private")
            out.append("        // (no getter), which would not compile.")
        else:
            out.append(f"        c.{boundary}(/* args */);   // boundary: the difference is observable after this call")
    else:
        out.append("        /* drive c in the diverging order; for a revert rule:")
        out.append("           bool reverted; try c.f(/* args */) { reverted = false; } catch { reverted = true; } */")
    if during_call:
        # V43: the difference is observable ONLY DURING the boundary's external call (reentrancy/CEI).
        # A post-call read is EQUAL on both contracts (the value is restored/cleared by the time the
        # call returns), so the test MUST observe MID-call from receive() into a state var — the same
        # mechanism the differential harness uses. Scaffold the observer; the agent fills the rule.
        g = observer_getter or "<the public getter of the target state>"
        out += [
            f"        // NOTE: this STATE difference is visible ONLY DURING the external call inside `{seq[-1] if seq else 'the boundary'}`",
            f"        //   (reentrancy/CEI). A read of c.{g}(...) AFTER the call is EQUAL on both contracts,",
            "        //   so observe it MID-call from receive(). Add these to the test contract:",
            "        //     bool __obsd;  <leafType> __snap;",
            f"        //     receive() external payable {{ if (!__obsd) {{ __obsd = true; __snap = c.{g}(address(this)); }} }}",
            "        //   receive() may ONLY READ c through a view getter — never a state-changing call.",
            "        assert(/* general rule over __snap (the value observed MID-call) — e.g. the value it",
            "                  must hold on the CORRECT contract, such as a balance already cleared to 0 */);",
        ]
    else:
        out.append("        assert(/* general rule over params, values read from c, and any revert flags */);")
    return "\n".join(out)


def _fmt(t: str) -> str:
    return t if t else "(none)"


def build_prompt_a(contract_code: str, editable_units: str, goal: str,
                   mutation_memory: str, avoid_statements: str) -> list[dict]:
    user = _PROMPT_A.format(CONTRACT_CODE=contract_code, EDITABLE_UNITS=editable_units, GOAL=goal,
                            MUTATION_MEMORY=_fmt(mutation_memory), AVOID_STATEMENTS=_fmt(avoid_statements))
    return [{"role": "system", "content": SYS_MUTATION}, {"role": "user", "content": user}]


def build_prompt_b(contract_code: str, editable_units: str, goal: str, mutation_memory: str,
                   avoid_statements: str, diag_kind: str, **diag) -> list[dict]:
    """Reflection on a MECHANICAL failure (§9): the diagnosis is prepended; the body re-issues Prompt A
    against the ORIGINAL units (not the failed attempt)."""
    diag_text = _B_DIAG[diag_kind].format(**diag)
    msgs = build_prompt_a(contract_code, editable_units, goal, mutation_memory, avoid_statements)
    msgs[1]["content"] = diag_text + "\n\n" + msgs[1]["content"]
    return msgs


def build_prompt_c(contract_code: str, contract_name: str, change: str, modified_unit_code: str,
                   difference: str, test_memory: str, call_sequence: list | None = None,
                   category: str | None = None, template: str = "full",
                   during_call: bool = False, observer_getter: str | None = None) -> list[dict]:
    """template="full" → the CE-scaffold fill-in template (Prompt C). template="minimal" → no_tt: the
    model synthesizes the whole InvMutTest contract itself (no scaffold), hard constraints retained.
    during_call/observer_getter (V42-44) thread the receive()-observer scaffold for reentrancy/TOD."""
    if template == "minimal":
        user = _PROMPT_C_MINIMAL.format(CONTRACT_CODE=contract_code, CONTRACT_NAME=contract_name,
                                        CHANGE=change, MODIFIED_UNIT_CODE=modified_unit_code,
                                        DIFFERENCE=difference, FLAT_SHAPE=_FLAT_SHAPE,
                                        TEST_MEMORY=_fmt(test_memory))
    else:
        user = _PROMPT_C.format(CONTRACT_CODE=contract_code, CONTRACT_NAME=contract_name, CHANGE=change,
                                MODIFIED_UNIT_CODE=modified_unit_code, DIFFERENCE=difference,
                                RUN_BODY=_run_body_scaffold(call_sequence, category, during_call, observer_getter),
                                FLAT_SHAPE=_FLAT_SHAPE, TEST_MEMORY=_fmt(test_memory))
    return [{"role": "system", "content": SYS_TEST}, {"role": "user", "content": user}]


def build_prompt_d(contract_code: str, contract_name: str, change: str, modified_unit_code: str,
                   difference: str, test_memory: str, diag_kind: str, call_sequence: list | None = None,
                   category: str | None = None, template: str = "full",
                   during_call: bool = False, observer_getter: str | None = None, **diag) -> list[dict]:
    diag_text = _D_DIAG[diag_kind].format(**{k: _fmt(v) for k, v in diag.items()})
    msgs = build_prompt_c(contract_code, contract_name, change, modified_unit_code, difference,
                          test_memory, call_sequence=call_sequence, category=category, template=template,
                          during_call=during_call, observer_getter=observer_getter)
    msgs[1]["content"] = diag_text + "\n\n" + msgs[1]["content"]
    return msgs


# --- require-only reflection (DEVIATIONS V40, two-phase test state machine) ----------------------
# Phase B of the test loop: once the assert has separated P/M (M was refuted at least once), the assert
# is LOCKED and only the require(...) precondition is reflected on. The prompt deliberately OMITS all
# mutant/difference information — the model sees only P, the failing test T, and (for tighten) P's
# counterexample. "tighten": P violates its own rule → exclude those inputs. "loosen": the require got
# so strict it also excludes the bug-exposing inputs → M no longer breaks → widen it back.
_REQUIRE_TIGHTEN = ("The test FAILS on P itself: for some inputs P already violates the asserted rule. A "
                    "counterexample is shown below. ADD or TIGHTEN a `require(...)` precondition at the "
                    "start of the function so those inputs are excluded and the rule holds on P.")
# tighten + setup (DeepSeek Pro arm 2026-09-07, config.precise_test_diags): the counterexample often shows a STATE the
# test contract itself is in (it deployed c, so it holds the owner/admin role) rather than an input; a require
# cannot exclude that, only a setup call can move c out of it. The assert stays locked; existing calls stay.
_REQUIRE_TIGHTEN_SETUP = (
    "The test FAILS on P itself: for some inputs or in some STATE of c, P already violates the asserted rule. "
    "A counterexample is shown below. Either ADD/TIGHTEN a `require(...)` precondition on the input "
    "parameters, OR — when the counterexample is about c's STATE (e.g. this test contract is c's owner/admin "
    "because it deployed c, so an access check passes for it) — INSERT one or more top-level setup calls on c "
    "BEFORE the existing calls that move c out of that state (e.g. hand the privileged role to an address "
    "taken as a parameter, with require(param != address(this))). A require on msg.sender or tx.origin "
    "is USELESS here: c always sees THIS test contract as msg.sender, so if the assert expects c to revert "
    "and the counterexample shows it did not, the cause is c's state (this contract holds the role) and the "
    "only fix is a setup call. Keep the assert and the existing calls exactly as they are.")
_REQUIRE_LOOSEN = ("Your `require(...)` precondition is now TOO RESTRICTIVE: it also excludes the inputs "
                   "that expose the bug, so the test no longer fails on the buggy version. RELAX / WIDEN "
                   "the `require(...)` so those inputs are allowed again, while keeping the rule true on P.")
# 'fix' mode (codex 2026-06-27): a post-lock attempt that did not compile / had the wrong shape. We must
# NOT feed mutant/difference info back once the assert is locked, so structural fixes go through THIS prompt
# (assert stays locked) instead of the full Prompt-D.
_REQUIRE_FIX = ("Your previous test did not verify cleanly (it failed to compile or had the wrong shape). "
                "Fix the problem shown below, but keep the single `assert(...)` EXACTLY as is — change only "
                "the `require(...)` and whatever structural fix is needed to make it a valid InvMutTest. "
                "If the compiler says a member of c was NOT FOUND, that member does not exist at all: do not "
                "rename it or guess another name — remove that read and obtain the fact another way (through "
                "c's listed public functions, or by setting the state up yourself).")

_PROMPT_REQUIRE = """We have a program P ({CONTRACT_NAME}) and a test T whose asserted RULE is already \
CORRECT and MUST NOT be changed. {DIRECTIVE}

# Program P ({CONTRACT_NAME}) — FOR REFERENCE, already defined in the compilation unit; do NOT re-declare it:
{CONTRACT_CODE}

# The current test T:
{TEST_CODE}
{COUNTEREXAMPLE_BLOCK}# HARD RULES — a violation makes your output useless:
- {EDIT_RULE} Keep the single \
`assert(...)` EXACTLY as is (same condition, same form).
- Output ONLY the single contract named exactly InvMutTest. Do NOT emit any pragma or SPDX line, and do \
NOT re-declare {CONTRACT_NAME} or any other contract — your source is appended after the existing code.
- Use input parameters in the require; do not hard-code throwaway values.
{FLAT_SHAPE}

These require attempts were already tried for this test; do not repeat them:
{TEST_MEMORY}

Respond with one JSON object and nothing else:
{{
  "property_summary": "<the SAME rule as before, restated in one short sentence>",
  "test_code": "<the full InvMutTest contract source with ONLY the require changed — no pragma, no SPDX>"
}}"""


def build_prompt_require(contract_code: str, contract_name: str, test_code: str, test_memory: str,
                         *, mode: str, counterexample: Optional[str] = None,
                         error_hint: Optional[str] = None, allow_setup: bool = False) -> list[dict]:
    """Phase-B require-only reflection (V40). mode='tighten' (P violates rule, show counterexample),
    'loosen' (require too strict, M no longer breaks), or 'fix' (post-lock compile/shape error, show it).
    NO mutant/difference info is EVER included — the assert is locked."""
    directive = {"tighten": _REQUIRE_TIGHTEN, "loosen": _REQUIRE_LOOSEN, "fix": _REQUIRE_FIX}[mode]
    edit_rule = ("Change ONLY the `require(...)` precondition(s) at the top of the function, and keep every "
                 "call on c and their order unchanged.")
    if mode == "tighten" and allow_setup:
        directive = _REQUIRE_TIGHTEN_SETUP
        edit_rule = ("Change ONLY the `require(...)` precondition(s) at the top of the function and/or INSERT "
                     "top-level setup calls on c BEFORE the existing calls; never remove or reorder the "
                     "existing calls on c.")
    if mode == "tighten":
        info_block = f"# A counterexample — inputs on which P violates the rule:\n{_fmt(counterexample)}\n\n"
    elif mode == "fix":
        info_block = f"# The problem with your previous test (fix it, keep the assert):\n{_fmt(error_hint)}\n\n"
    else:  # loosen
        info_block = ""
    user = _PROMPT_REQUIRE.format(CONTRACT_NAME=contract_name, CONTRACT_CODE=contract_code,
                                  TEST_CODE=test_code, DIRECTIVE=directive, EDIT_RULE=edit_rule,
                                  COUNTEREXAMPLE_BLOCK=info_block, FLAT_SHAPE=_FLAT_SHAPE,
                                  TEST_MEMORY=_fmt(test_memory))
    return [{"role": "system", "content": SYS_TEST}, {"role": "user", "content": user}]


# =================================================================================================
# RQ1 LLM-ONLY BASELINE (USER 2026-06-26) — no formal verifier (ESBMC) anywhere.
# The mutation prompt is boundary-aware (one mutant per (observational target y, boundary entry x));
# the test prompt asks the model to emit a COMPLETE, standalone Foundry *.t.sol directly (NO intermediate
# ESBMC-verifiable InvMutTest contract, NO counterexample — there is no verifier to produce one). See
# notes/RQ1_LLM_ONLY_PLAN.md. The JSON output schemas match Prompt A / Prompt C so the agents reuse the
# same parsers.
# -------------------------------------------------------------------------------------------------

# config.mutate_preconditions: both mutation prompts already name ONE guard form -- "drop an
# `onlyOwner` / `nonReentrant` guard" -- but never the other two forms a Solidity precondition takes,
# `require(...)` and `if (...) revert`. The batch prompt additionally asks only for mutants the model
# is CONFIDENT change observable behaviour, and a precondition deletion diverges only on the inputs
# that violate it, so the model self-censors exactly that operator. MEASURED on this corpus: 85 of 124
# cases are guard-class (the fix ONLY adds a require / modifier / revert), and 52 of the 73
# D1_validated_no_kill cases are guard-class. Completing the operator list the prompt already began is
# symmetric; it reads no patch and names no case, function or condition. "" = published prompt.
_PRECONDITION_NOTE = (
    " A precondition check is a statement like any other: `require(cond, \"..\")`, "
    "`if (cond) revert(..)` and a modifier invocation are the SAME kind of guard, so deleting or "
    "weakening one is an admissible single-statement edit. Such an edit diverges only on the inputs "
    "that violate the guard, which is a real non-equivalent difference, not a speculative one."
)

_PROMPT_LLM_MUTATE = """Here is a Solidity contract P:
{CONTRACT_CODE}

Produce a strong and non-equivalent mutant M of P that differs by exactly one single-statement edit \
— rewrite, delete, insert, or move one statement (a reorder is one move, not two edits) — made only \
inside the body of one of these units:
{EDITABLE_UNITS}

Choose the edit so that, when the contract is driven through the public/external entry `{BOUNDARY}`, \
{GOAL}. That is, there exists a call sequence ending in `{BOUNDARY}` on which the original P and your \
mutant M produce that observable difference.

Keep every function name, parameter list, return list, and visibility unchanged; add or \
remove no function, state variable, or import. You MAY add, remove, or change a modifier \
invocation on a function (e.g. drop an `onlyOwner` / `nonReentrant` guard); M must compile.{PRECONDITION_NOTE}

Do not repeat any of these edits:
{MUTATION_MEMORY}

Respond with one JSON object and nothing else:
{{
  "unit_id": "<the id, e.g. U001, of the one unit you edited>",
  "operation": "replace | insert | delete | move",
  "change_summary": "<one sentence describing the edit>",
  "mutated_unit_code": "<the full source of that unit after your edit>"
}}"""

# RQ1 LLM-only BATCH mutation (USER 2026-06-26): one call PER TARGET that asks for ALL first-order mutants
# of that target's behavior at once. The per-boundary decomposition of _PROMPT_LLM_MUTATE only existed to
# bound ESBMC differential-verification cost; llm_only has NO verifier, so iterating boundaries was pure
# wasted LLM calls (ERRORS #145). One call → a list of FOMs; each is statically gated + test-looped.
_PROMPT_LLM_MUTATE_BATCH = """Here is a Solidity contract P:
{CONTRACT_CODE}

Produce EVERY distinct, non-equivalent first-order mutant (FOM) of P that could change the behavior \
observable at this target: {GOAL} The behavior is observed through the public/external surface, e.g.: \
{BOUNDARIES}.

Each mutant must differ from P by exactly ONE single-statement edit — rewrite, delete, insert, or move one \
statement (a reorder is one move, not two edits) — made only inside the body of one of these units:
{EDITABLE_UNITS}

Include ONLY mutants you are CONFIDENT genuinely change that observable behavior — a real, non-equivalent \
semantic difference that some call sequence ending at the public surface above would actually expose. If you \
are NOT sure a candidate edit truly changes the observable behavior (it might be equivalent, or only touch \
internal state that is never surfaced), DO NOT emit it. Prefer a few high-confidence mutants over many \
speculative ones; do not pad the list. Do not emit two mutants with the same edit. Keep every function \
name, parameter list, return list, and visibility unchanged; add or remove no function, state \
variable, or import. You MAY add, remove, or change a modifier invocation on a function (e.g. drop an \
`onlyOwner` / `nonReentrant` guard); every mutant must compile.{PRECONDITION_NOTE}

Respond with one JSON object and nothing else:
{{
  "mutants": [
    {{
      "unit_id": "<the id, e.g. U001, of the one unit this mutant edited>",
      "operation": "replace | insert | delete | move",
      "change_summary": "<one sentence describing the edit>",
      "mutated_unit_code": "<the full source of that unit after your edit>"
    }}
  ]
}}"""

# A complete standalone Foundry test file, shape-locked to render/foundry.py:_emit so it drops straight
# into workspace test/InvMutTest.t.sol and compiles. SYS_TEST is reused.
_PROMPT_LLM_TEST = """Here is a Solidity contract P ({CONTRACT_NAME}), the REFERENCE (correct) version:
{CONTRACT_CODE}{PUBLIC_SURFACE}

A one-statement mutant M changes it as follows:
{CHANGE}

The full changed version of that unit is:
{MODIFIED_UNIT_CODE}

Driven through the public/external entry `{BOUNDARY}`, P and M differ in this way: {GOAL}.

Write a COMPLETE Foundry test that PASSES on the reference {CONTRACT_NAME} and FAILS on the buggy version \
using ONE specific, fully CONCRETE scenario. You must:
- CHOOSE specific concrete input values and a specific call sequence that, given the difference above, \
drive the contract to a state where the reference and the bug OBSERVABLY diverge. Reason from the change \
to pick values that actually trigger it (the exact boundary value, an amount crossing a threshold, the \
caller/order that matters).
- HARD-CODE those values directly in the test body. The test takes NO parameters.
- End with exactly one assertion the reference satisfies AND the bug breaks FOR THIS CONCRETE SCENARIO, \
reading c's PUBLIC surface (getters / view returns / address(c).balance / revert booleans).

This is a single concrete WITNESS: "on THIS input, the correct contract behaves one way and the buggy one \
another." It need NOT hold for all inputs — it must be a real, specific execution where they differ.

Output EXACTLY this file shape and NOTHING else (no prose, no extra contracts):

// SPDX-License-Identifier: UNLICENSED
{PRAGMA}
import {{Test}} from "forge-std/Test.sol";
import {{{IMPORT_SYMBOLS}}} from "{IMPORT_PATH}";

contract InvMutTest is Test {{
    {CONTRACT_NAME} c;
    function setUp() public {{ {CONSTRUCTION_BODY} }}
    function testRegression_property() public {{
        // 1. (optional) vm.deal/vm.prank/vm.warp to set up the specific scenario
        // 2. if state is needed, write 1+ concrete `c.<fn>(...)` statements IN ORDER, ending at `{BOUNDARY}`
        // 3. exactly one assertTrue(<concrete fact reading c>) the reference holds and the bug breaks
    }}
}}{CONSTRUCTION_DECLS}

HARD RULES — a violation makes the test REJECTED (not just useless):
- The test function MUST be named `testRegression_property` and take NO parameters. Do NOT define any \
`testFuzz_*` function and do NOT add parameters — a parameterized / fuzz test is REJECTED outright.
- Do NOT use `vm.assume` or `bound` (those are for fuzzing). You MAY use `vm.deal`, `vm.prank`, \
`vm.startPrank`, `vm.stopPrank`, `vm.warp`, `vm.roll` to set up the concrete scenario — NO other vm.* \
cheatcodes (vm.expectRevert / vm.store / vm.mockCall etc. are REJECTED).
- The contract MUST be named exactly `InvMutTest`, inherit `Test`. Keep the two imports and SPDX/pragma \
EXACTLY. Do NOT re-declare/copy/import {CONTRACT_NAME}; define no other contract/interface/library.
- Deploy in `setUp()` using the given `{CONSTRUCTION}` verbatim. Interact ONLY through `c`.
- Observe c ONLY through its PUBLIC/EXTERNAL surface: auto-generated getters of `public` state variables, \
`public`/`external` view/pure return values, `address(c).balance`, and revert booleans. A \
`private`/`internal` variable has NO getter — reading `c.<name>(...)` for it is a compile error.
- The single `assertTrue` MUST read c's ACTUAL behavior (a getter/return/`address(c).balance`/a revert \
bool from try/catch) — NOT a constant, NOT literal-vs-literal, NOT assert(true).
- For a revert difference, wrap the boundary call in `try c.{BOUNDARY}... {{ ok = true; }} catch {{ ok = \
false; }}` and assert over the `ok` flag.
- For a payable call needing Ether: `vm.deal(actor, amount);` then `vm.prank(actor); c.f{{value: amount}}(...);`.

These approaches were already tried for this difference; do not repeat them:
{TEST_MEMORY}

Respond with one JSON object and nothing else:
{{
  "property_summary": "<one sentence: the concrete scenario and what diverges>",
  "test_code": "<the COMPLETE Solidity source of the standalone Foundry file shown above>"
}}"""

# Foundry-execution-driven reflection diagnoses (LLM-only has no ESBMC outcomes — OF-7).
_LLM_TEST_DIAG = {
    "did_not_compile": ("Your previous test did not compile:\n{COMPILER_ERROR}\nFix it WITHOUT changing the "
                        "concrete scenario's intent, keeping the exact file shape (SPDX, pragma, the two "
                        "imports, `contract InvMutTest is Test`, `setUp`, ONE no-parameter "
                        "`testRegression_property()`)."),
    "fails_on_original": ("Your concrete test already FAILS on the reference {CONTRACT_NAME} (before any "
                          "bug). {FORGE_LOG} Your chosen inputs or the asserted fact are wrong for the "
                          "reference — pick different concrete values / a different call sequence (do NOT add "
                          "fuzz params or bound/vm.assume) so the reference passes."),
        "reverts_on_original": (
        "Your concrete test does not FALSIFY anything on the reference {CONTRACT_NAME} -- it REVERTS "
        "there. {FORGE_LOG} Fix the CAUSE, not the values. If a SETUP call reverted, make that setup "
        "legitimately succeed -- acquire the role or state it needs through the contract's own public "
        "functions (the test contract deployed c, so it holds whatever role the constructor assigned; "
        "use vm.prank only when you deliberately act as someone else). If the DECIDING call reverted, "
        "that revert IS the observable behaviour: keep the call and the values, wrap it as "
        "`try c.f(...) {{ ok = true; }} catch {{ ok = false; }}` and assert on `ok`, so the reference's "
        "revert is a PASS and the bug's non-revert is the failure."
    ),
    "holds_on_modified": ("Your concrete inputs do NOT distinguish the bug — the test passes on the mutant "
                          "too. {FORGE_LOG} Pick a DIFFERENT concrete input / call sequence (e.g. the exact "
                          "boundary value, an amount crossing the threshold, the caller/order that matters) "
                          "that the bug actually breaks. Keep it a single no-parameter concrete test."),
    "setup_failed": ("Your previous test's `setUp()` reverted — deployment failed. {FORGE_LOG} Use the given "
                     "`{CONSTRUCTION}` verbatim and do not put assertions or calls in setUp."),
    "cheat_rejected": ("Your previous test was REJECTED for using a forbidden form. {FORGE_LOG} Emit exactly "
                       "ONE no-parameter `testRegression_property()` (NO `testFuzz_*`, no other test "
                       "function, NO function parameters), use only vm.deal/prank/startPrank/stopPrank/warp/"
                       "roll, and make the single assertTrue read c's actual behavior (a getter/return/"
                       "balance/revert bool)."),
    "not_sound_witness": ("Your test did not form a valid witness: the single `testRegression_property()` "
                          "must actually RUN and PASS on the correct contract AND RUN and FAIL on the buggy "
                          "one for your concrete inputs. {FORGE_LOG} Make sure the test executes (no early "
                          "revert before the deciding assert) and that your chosen inputs really make the "
                          "bug's behavior fail the assertion."),
    "inconclusive": ("The previous test was inconclusive (timeout/no suite). {FORGE_LOG} Make sure the "
                     "contract is named `InvMutTest`, inherits `Test`, and has ONE no-parameter "
                     "`testRegression_property()`; keep the scenario simple."),
}


def build_prompt_llm_mutate(contract_code: str, editable_units: str, goal: str, boundary: str,
                            mutation_memory: str, precondition_note: str = "") -> list[dict]:
    user = _PROMPT_LLM_MUTATE.format(CONTRACT_CODE=contract_code, EDITABLE_UNITS=editable_units,
                                     GOAL=goal, BOUNDARY=boundary, PRECONDITION_NOTE=precondition_note,
                                     MUTATION_MEMORY=_fmt(mutation_memory))
    return [{"role": "system", "content": SYS_MUTATION}, {"role": "user", "content": user}]



# --- statement-coverage lever (config.mutate_statement_coverage, default OFF) ----------------------
# MEASURED (2026-09-22, rc_unchecked_low_level_calls__0xe894d54...__TIPS, whose fix adds only
# `if (!_s) { revert(); }` around an unchecked low-level call): the batch mutate prompt shows the model
# only `unit_id: signature (lines a-b)`, never the unit's statements, and never asks for coverage.  0 of
# that run's 5 candidates and 1 of the 44 published ones edit the success-check statement -- so the one
# behaviour a killing test would have to pin down never gets a mutant, and the case is a class-(a) miss
# (focus produced no mutant), not a test-side failure.  ON: the unit listing carries Doc-1's statement
# table and the batch is asked to spread over distinct statements first.  Says nothing about which
# statement matters; it is coverage of the unit's own statement list.
_MUTATE_COVERAGE_REWRITES = [
    ('Prefer a few high-confidence mutants over many speculative ones; do not pad the list. Do not emit '
     'two mutants with the same edit.',
     'Prefer a few high-confidence mutants over many speculative ones; do not pad the list. Do not emit '
     'two mutants with the same edit. COVER DISTINCT STATEMENTS: every unit above is listed with its '
     'statement table (statement id, node type, line). Emit AT MOST ONE mutant per statement until every '
     'listed statement has one; only then may a second mutant touch a statement you already edited. A '
     'statement you never mutate is a behaviour that no test will ever be asked to pin down, so do not '
     'spend the whole batch on the first one or two statements of the unit.'),
]


def _mutate_coverage(template: str, on: bool) -> str:
    """Return `template` unchanged when the lever is OFF (byte-identical official prompt)."""
    if not on:
        return template
    out = template
    for old, new in _MUTATE_COVERAGE_REWRITES:
        n = out.count(old)
        if n != 1:
            raise AssertionError(f"mutate coverage anchor occurs {n}x: {old[:60]!r}")
        out = out.replace(old, new)
    return out


# --- CALL-ORDER move lever (config.mutate_call_order, default OFF) --------------------------------
# The batch prompt already allows `move` and the JSON schema already has "move", but the operation is
# never associated with the state updates around an external call.  MEASURED
# (rcx_reentrancy__0x4320e6..__SmartFix, whose real fix MOVES `balances[msg.sender] -= _am` from after
# `msg.sender.call{value:_am}("")` to before it): a 660 s run under the x-call ordering reached the
# Collect boundary and proposed 11 mutants there -- guard flips, subtraction->addition, zero transfer
# amount, drop the success check -- and NOT ONE of them moves the state update across the call, so the
# one mutant that mirrors the real defect never exists and the case is a class-(a) miss.  ON: name the
# call-order move as an admissible one-edit mutant for any unit that has both an external call and a
# state update.  It says nothing about which unit or which direction is the bug -- the trigger is the
# presence of an external call in the REFERENCE unit.  False = official behaviour.
_MUTATE_CALLORDER_REWRITES = [
    ('Each mutant must differ from P by exactly ONE single-statement edit — rewrite, delete, insert, or move one statement (a reorder is one move, not two edits) — made only inside the body of one of these units:',
     'Each mutant must differ from P by exactly ONE single-statement edit — rewrite, delete, insert, or move one statement (a reorder is one move, not two edits) — made only inside the body of one of these units: CALL-ORDER MOVES: when a unit makes an external call (`.call{{value: ...}}(...)`, `.transfer(...)`, `.send(...)`, or a call on a contract-typed state variable), the move operation also applies to the state updates AROUND that call: moving a state update from BEFORE the call to AFTER it, or from after to before, is exactly ONE move. It changes only WHEN the state is written — indistinguishable to an observer that reads the state after the call returns, but plainly different to the callee while the call is still in progress, and to any caller the callee re-enters. Whenever a unit contains BOTH an external call and a state update, emit that move as one of its distinct behaviours.'),
]


def _mutate_callorder(template: str, on: bool) -> str:
    """Return `template` unchanged when the lever is OFF (byte-identical official prompt)."""
    if not on:
        return template
    out = template
    for old, new in _MUTATE_CALLORDER_REWRITES:
        n = out.count(old)
        if n != 1:
            raise AssertionError(f"mutate call-order anchor occurs {n}x: {old[:60]!r}")
        out = out.replace(old, new)
    return out



def build_prompt_llm_mutate_batch(contract_code: str, editable_units: str, goal: str,
                                  boundaries: str, patch_diff: Optional[str] = None,
                                  fewshot: Optional[str] = None,
                                  precondition_note: str = "",
                                  statement_coverage: bool = False,
                                  call_order: bool = False) -> list[dict]:
    """RQ1 LLM-only: one call per target → ALL FOMs of that target's behavior (ERRORS #145). CONTRACT_CODE
    is first (stable cache prefix); the variable goal/boundaries/units follow.
    `patch_diff` (diff-anchored mutation, USER 2026-06-30): appended LAST (keeps the CONTRACT_CODE cache
    prefix stable) so the model ALSO proposes a mutant that reverts the patch (M ~= the real bug)."""
    user = _mutate_callorder(_mutate_coverage(_PROMPT_LLM_MUTATE_BATCH, statement_coverage),
                             call_order).format(
                                           CONTRACT_CODE=contract_code, EDITABLE_UNITS=editable_units,
                                           GOAL=goal, BOUNDARIES=boundaries,
                                           PRECONDITION_NOTE=precondition_note)
    if patch_diff:
        user += _DIFF_ANCHOR_SUFFIX.format(PATCH_DIFF=patch_diff[:6000])
    if fewshot:            # config.mutation_fewshot; appended last, after the cache-stable prefix
        user += fewshot
    return [{"role": "system", "content": SYS_MUTATION}, {"role": "user", "content": user}]


# diff-anchored mutation guidance (USER 2026-06-30), appended after the batch prompt body. The reference C was
# produced by PATCHING a vulnerable contract; the patch (vulnerable -> fixed, unified diff) is shown so the
# model can emit a first-order mutant that UNDOES the patch inside an editable unit — making the mutant a
# faithful proxy for the real vulnerability (so a test that separates P from this mutant also catches the bug).
# ---------------------------------------------------------------------------------------------------
# config.mutation_fewshot (2026-09-10): worked (goal -> edit) exemplars for the batch mutate prompt.
#
# Measured motivation (notes/UPLIFT_EVIDENCE_20260910.md §13): over the official arm's 633 case logs,
# 2,282 of 3,687 `inconclusive` mutation events are `focused_no_difference` -- the edit compiled, was
# not a duplicate, and ESBMC saw NO behavioural difference at the focused boundary. The batch prompt
# carries no example of an edit that pays off, and the mutation side has no reflection path at all
# (run.py:_run_cell is a pure filter), so that failure mode gets no feedback of any kind.
#
# Discipline:
#   * the exemplars live on a TOY contract (`Box`), never on a benchmark case -- an exemplar lifted
#     from a case would be case overfitting, which is a hard constraint.
#   * each shape shows ONE edit that changes the observed behaviour and ONE that does not, because the
#     failure being targeted is exactly "looks like a change, is not observable at this boundary".
#   * appended AFTER the prompt body like _DIFF_ANCHOR_SUFFIX, so the {CONTRACT_CODE} cache prefix
#     stays byte-stable and the block costs miss-priced input only on its own tokens.
_FEWSHOT_TOY = """contract Box {
    address public owner;
    uint256 public total;
    mapping(address => uint256) public bal;
    function put(uint256 a) external { bal[msg.sender] += a; total += a; }
    function take(uint256 a) external returns (uint256 left) { require(a <= bal[msg.sender]);
        bal[msg.sender] -= a; total -= a; left = bal[msg.sender]; }
    function setOwner(address o) external { require(msg.sender == owner); owner = o; }
}"""

_FEWSHOT_BY_SHAPE = {
    "scalar": ("`P.total() != M.total()` after `put(a)`",
               "in `put`, change `total += a;` to `total += a - 1;` -- a caller with a >= 1 leaves a "
               "different `total`, readable through the getter",
               "in `put`, reorder `bal[msg.sender] += a;` and `total += a;` -- both still execute, so "
               "`total` ends identical and the focused check sees no difference"),
    "mapping": ("`P.bal(k) != M.bal(k)` at some key k after `put(a)`",
                "in `put`, change `bal[msg.sender] += a;` to `bal[address(0)] += a;` -- the credit "
                "lands at a different key, so some key differs",
                "in `put`, change `bal[msg.sender] += a;` to `bal[msg.sender] = bal[msg.sender] + a;` "
                "-- identical semantics, no key differs"),
    "balance": ("`address(this).balance` differs after the entry returns",
                "delete the `require(a <= bal[msg.sender]);` guard in `take` so a call that P rejects "
                "goes through in M and moves value",
                "rename a local in `take` -- no value moves differently"),
    "return": ("`P.take(a)` and `M.take(a)` both complete but return different values",
               "in `take`, change `left = bal[msg.sender];` to `left = bal[msg.sender] + 1;` -- the "
               "returned value differs on every call that completes",
               "in `take`, change it to `left = bal[msg.sender]; return left;` -- same value returned"),
    "revert": ("exactly one of P and M reverts on the same call",
               "in `setOwner`, drop `require(msg.sender == owner);` -- a non-owner call reverts in P "
               "and completes in M",
               "in `setOwner`, change the guard to `require(msg.sender == owner, \"not owner\");` -- "
               "both still revert on the same calls"),
}

_FEWSHOT_SUFFIX = """

WORKED EXAMPLES (a different, unrelated toy contract -- do NOT edit it, do NOT mention it in your answer;
it is here only to show what "genuinely changes the observed behaviour" means for a goal of this shape):
```solidity
{TOY}
```
For the goal {SHAPE_GOAL}:
  PAYS OFF  -- {GOOD}
  DOES NOT  -- {BAD}
The second kind is the most common wasted mutant: it edits the unit but nothing the goal observes ends up
different, so it is filtered out and the budget is spent for nothing. Emit the first kind only.
"""


def fewshot_block(category: str | None, state_kind: str | None = None,
                  alias_explicit_revert: bool = False) -> str | None:
    """The exemplar block for a focus of this shape, or None when the shape is unknown.

    `category` is the target category (`state` / `return` / `revert`) and `state_kind` the state shape
    (`scalar` / `mapping` / `balance`) -- the same five shapes goal_state/goal_return/goal_revert render.
    """
    if alias_explicit_revert and category == "explicit_revert":
        category = "revert"
    shape = ("return" if category == "return" else "revert" if category == "revert" else
             (state_kind if state_kind in ("scalar", "mapping", "balance") else "scalar")
             if category == "state" else None)
    if shape is None:
        return None
    goal, good, bad = _FEWSHOT_BY_SHAPE[shape]
    return _FEWSHOT_SUFFIX.format(TOY=_FEWSHOT_TOY, SHAPE_GOAL=goal, GOOD=good, BAD=bad)


_DIFF_ANCHOR_SUFFIX = """

DIFF-ANCHORED MUTANT (IMPORTANT): the reference C above was produced by PATCHING a vulnerable contract. Here is
that patch as a unified diff (the vulnerable version on '-' lines, the fixed version on '+' lines):
```diff
{PATCH_DIFF}
```
AMONG your mutants, INCLUDE AT LEAST ONE first-order mutant that RESTORES the vulnerable behaviour the patch
removed — i.e. edit an editable unit so it behaves like the '-' (vulnerable) side of the diff (e.g. drop the
added check / restore the old assignment or return). This single-statement reversal must stay within ONE
editable unit and keep the same function signature. List it alongside your other FOMs in the same JSON array.
"""


# forge-std/Test.sol's own exports. A symbol-list import that repeats one of these is a redeclaration
# error, so config.import_file_level_types filters them out of the extra symbols.
_FORGE_STD_EXPORTS = frozenset({
    "Test", "TestBase", "StdAssertions", "StdChains", "StdCheats", "StdCheatsSafe", "StdInvariant",
    "StdUtils", "StdStorage", "StdStyle", "StdError", "CommonBase", "ScriptBase", "Script",
    "Vm", "VmSafe", "console", "console2", "safeconsole", "stdError", "stdJson", "stdMath",
    "stdStorage", "stdStorageSafe",
})

# A top-level declaration in the flat source: `interface X`, `library X`, `contract X`, `struct X`,
# `enum X`, `type X`. Indentation must be zero -- a member struct/enum lives INSIDE the contract and is
# reached as `C.X`, so importing its bare name would not resolve.
_TOP_LEVEL_DECL = re.compile(
    r"^(?:abstract\s+)?(?:interface|library|contract|struct|enum|type)\s+([A-Za-z_]\w*)", re.M)


def file_level_types(source: str, contract_name: str) -> list[str]:
    """Top-level type names the flat source declares, minus C and minus forge-std's own exports.

    config.import_file_level_types (2026-09-22). The rendered test imports ONLY `{C}` and the prompts
    forbid adding imports, so an entry point whose SIGNATURE names a file-level type has no legal call
    at all: `PrivatePool.sell(..., IStolenNftOracle.Message[] calldata stolenNftProofs)` needs
    `new IStolenNftOracle.Message[](0)`, and `IStolenNftOracle` is a top-level interface, not a member
    of C.  MEASURED on pop_018_PrivatePool trial 1 (DeepSeek Pro arm): 73 of the case's 80 test attempts were
    foundry_compile_failed_P, all on the patched boundary `sell`, every sampled one with
    `Error (7920): Identifier not found or not unique.` at the `IStolenNftOracle.Message` use; adding
    the file-level symbols to the import makes that exact stored attempt compile.
    """
    out, seen = [], {contract_name}
    for m in _TOP_LEVEL_DECL.finditer(source or ""):
        n = m.group(1)
        if n in seen or n in _FORGE_STD_EXPORTS:
            continue
        seen.add(n)
        out.append(n)
    return out


def import_symbols(contract_name: str, construction: str, file_types: str = "") -> str:
    """The symbol list for `import {...} from "<src>"` in a rendered Foundry test.

    A construction expression may deploy a real dependency instance
    (`new C(address(new Log()))`, config.deploy_real_dependency_fixtures) — those types live in the SAME
    src file as C, but a symbol-list import only brings C into scope, so `new Log()` would fail with
    "Identifier not found or not unique". Derived from the construction text alone, so no call site
    needs a new argument; empty of deps => exactly the previous `{C}`."""
    deps = [t for t in re.findall(r"\bnew\s+([A-Z]\w*)\s*\(", construction or "") if t != contract_name]
    # config.import_file_level_types: the caller passes the flat source's top-level type names here
    # (empty string = published behaviour, so the symbol list is byte-identical).
    deps += [t.strip() for t in (file_types or "").split(",") if t.strip()]
    seen, out = {contract_name}, [contract_name]
    for d in deps:
        if d not in seen:
            seen.add(d)
            out.append(d)
    return ", ".join(out)


# --- OBSERVING COUNTERPARTY lever (config.external_observer_helper, default OFF) -------------------
# MEASURED (2026-09-22, rcx_unchecked_low_level_calls family): the test prompt makes a bug whose ONLY
# effect leaves c through an external call UNOBSERVABLE, so the arm can produce a validated PUT that the
# real bug passes (D1_validated_no_kill).  `demo.transfer(from,caddress,_tos,v)` is stateless: bug sends
# `abi.encodePacked(id,...)` (76-byte calldata), fix sends `abi.encodeWithSelector(id,...)` (100-byte).
# The accepted PUT in all 5 published cells asserts only `assertTrue(ret)`, which BOTH sides satisfy.
#   * the regression prompt says "define no other contract/interface/library", so it cannot deploy one
#     at all.
# A helper that only STORES what c sent it is not a second subject: its record IS c's externally
# observable behaviour, and the existing P-pass/M-fail gate already discards a helper-only assertion
# that ignores c (it would pass on both sides).  The rewrites are applied to the TEMPLATE before
# .format(), so the placeholders below are the template's own `{...}` / escaped `{{...}}`.
_OBSERVER_REWRITES = {
    "test": [
        ('- End with exactly one assertion the reference satisfies AND the bug breaks FOR THIS CONCRETE '
         'SCENARIO, reading c\'s PUBLIC surface (getters / view returns / address(c).balance / revert '
         'booleans).',
         '- End with exactly one assertion the reference satisfies AND the bug breaks FOR THIS CONCRETE '
         'SCENARIO, reading c\'s PUBLIC surface (getters / view returns / address(c).balance / revert '
         'booleans).\n'
         '- COUNTERPARTY: if the difference only shows up in c\'s interaction with ANOTHER contract — a '
         'low-level `call`/`transfer`/`send` whose callee FAILS or REVERTS, an unchecked return value, '
         'a RE-ENTRANT caller, or WHAT c SENDS OUT (the calldata carried, whether the call happens at '
         'all, how often, with how much value) — a plain address value cannot embody it: an address '
         'with no code accepts every low-level call and records nothing. Deploy a minimal helper '
         'contract that either behaves adversarially (`fallback() external payable {{ revert(); }}`, a '
         're-entrant `receive()`) or RECORDS what it received (`msg.data`, `msg.data.length`, '
         '`msg.value`, a counter, the decoded arguments), pass its address where c expects the '
         'counterparty, and assert over what it recorded. That record IS c\'s externally observable '
         'behaviour.'
         ' If c makes the SAME external call inside a LOOP, a recorder that keeps only the LAST one describes only the LAST iteration, so a rule written over every element will fail on the reference: ACCUMULATE instead (a counter, a running total, a per-recipient mapping, an array), or restrict the domain so exactly one such call happens.'
         ' Make the helper MATCH what c calls: when c dispatches by SELECTOR (`abi.encodeWithSelector` / `encodeWithSignature` / a hand-built `call(abi.encode...)`), declare that function on the helper with that exact signature and record INSIDE it, so the ABI decoder is part of the observation. A bare `fallback()` that swallows every call records only that SOMETHING arrived -- it cannot tell a well-formed call from a malformed one.'
         ' If the mutant changes how c REACTS to the outcome of that call -- it checks, ignores, or propagates the success flag -- then a helper that ALWAYS succeeds exercises only ONE of the two outcomes, and a rule written over that one outcome says nothing about the other. Give the helper a switch the test controls (a `bool shouldFail` it reads, or a second reverting instance), drive c through BOTH, and state the rule over the outcome that actually separates them.'),
        ('Output EXACTLY this file shape and NOTHING else (no prose, no extra contracts):',
         'Output EXACTLY this file shape and NOTHING else (no prose). You MAY append minimal helper '
         'contract(s) AFTER `InvMutTest` ONLY when the COUNTERPARTY rule above requires one:'),
        ('Do NOT re-declare/copy/import {CONTRACT_NAME}; define no other contract/interface/library.',
         'Do NOT re-declare/copy/import {CONTRACT_NAME}. You MAY define minimal helper contract(s) '
         'AFTER `InvMutTest` ONLY when the COUNTERPARTY rule requires one — keep them tiny and import '
         'nothing new.'),
        ('- Deploy in `setUp()` using the given `{CONSTRUCTION}` verbatim. Interact ONLY through `c`.',
         '- Deploy in `setUp()` using the given `{CONSTRUCTION}` verbatim. Interact ONLY through `c` (you '
         'MAY additionally deploy a counterparty helper and read what it recorded).'),
        ('- Observe c ONLY through its PUBLIC/EXTERNAL surface: auto-generated getters of `public` state '
         'variables, `public`/`external` view/pure return values, `address(c).balance`, and revert '
         'booleans. A `private`/`internal` variable has NO getter — reading `c.<name>(...)` for it is '
         'a compile error.',
         '- Observe c ONLY through its PUBLIC/EXTERNAL surface: auto-generated getters of `public` state '
         'variables, `public`/`external` view/pure return values, `address(c).balance`, and revert '
         'booleans. A `private`/`internal` variable has NO getter — reading `c.<name>(...)` for it is '
         'a compile error. When c\'s effect leaves it ONLY through an external call, the getters of a '
         'RECORDING helper you deployed count as part of that observable surface.'),
    ],
}


def _observer(template: str, kind: str, on: bool) -> str:
    """Return `template` unchanged when the lever is OFF (byte-identical official prompt), else apply the
    OBSERVING COUNTERPARTY rewrites. Each anchor must occur EXACTLY once; a drifted anchor raises rather
    than silently producing the old prompt under a flag that says it changed."""
    if not on:
        return template
    out = template
    for old, new in _OBSERVER_REWRITES[kind]:
        n = out.count(old)
        if n != 1:
            raise AssertionError(f"observer rewrite anchor occurs {n}x in {kind} prompt: {old[:60]!r}")
        out = out.replace(old, new)
    return out


# --- LIVE CALLBACK lever (config.reentrancy_live_callback, default OFF) ---------------------------
# MEASURED (Results/RQ1/InvMut, 390 accepted tests of the 23 reentrancy cases, grouped by the shape of
# the test's own receive()/fallback() and cross-tabbed against the real-bug verdict):
#     no callback at all      351 accepted ->   6 bug_fail =  1.7 pct
#     live, does not call c    15 accepted ->  10 bug_fail = 66.7 pct
#     live, re-enters c        24 accepted ->   6 bug_fail = 25.0 pct
# i.e. 90 pct of accepted reentrancy tests carry no callback and convert at 1.7 pct, while any LIVE
# callback converts 15-40x better.  The family's accepted->kill rate is 7.2 pct vs 24.9 pct for the rest
# of the corpus.  _PROMPT_LLM_TEST never mentions a callback at all (its skeleton has none and it forbids
# other contracts). Meanwhile verify/canonical.py:_callback_captures (V43) ALREADY permits exactly one
# guarded re-entrant `c.f(args);` in a callback -- the prompts are behind the validator.
# The trigger is read off the REFERENCE unit shown in the prompt ("the unit sends value / calls back to
# its caller"), never off the bug or the patch, so it stays bug-agnostic.
# ON: state the rule and scaffold the guarded shape.  False = official behaviour.
_LIVE_CALLBACK_REWRITES = {
    "test": [
        ('    function testRegression_property() public {{\n        // 1. (optional) vm.deal/vm.prank/vm.warp to set up the specific scenario\n        // 2. if state is needed, write 1+ concrete `c.<fn>(...)` statements IN ORDER, ending at `{BOUNDARY}`\n        // 3. exactly one assertTrue(<concrete fact reading c>) the reference holds and the bug breaks\n    }}\n}}{CONSTRUCTION_DECLS}', '    function testRegression_property() public {{\n        // 1. (optional) vm.deal/vm.prank/vm.warp to set up the specific scenario\n        // 2. if state is needed, write 1+ concrete `c.<fn>(...)` statements IN ORDER, ending at `{BOUNDARY}`\n        // 3. exactly one assertTrue(<concrete fact reading c>) the reference holds and the bug breaks\n    }}\n    // (optional) LIVE CALLBACK -- include ONLY when the CONTROLLED CALLEE rule applies; omit otherwise:\n    // bool private __entered;\n    // receive() external payable {{ if (!__entered) {{ __entered = true; c.<fn>(/* args */); }} }}\n}}{CONSTRUCTION_DECLS}'),
        ('- The contract MUST be named exactly `InvMutTest`, inherit `Test`. Keep the two imports and SPDX/pragma EXACTLY. Do NOT re-declare/copy/import {CONTRACT_NAME}; define no other contract/interface/library.', '- The contract MUST be named exactly `InvMutTest`, inherit `Test`. Keep the two imports and SPDX/pragma EXACTLY. Do NOT re-declare/copy/import {CONTRACT_NAME}; define no other contract/interface/library.\n- CONTROLLED CALLEE: if the unit shown above sends value or makes a low-level call BACK to its caller (`msg.sender.call{{value: ...}}("")`, `.transfer(...)`, `.send(...)`) or to an address the caller supplied, then THIS TEST CONTRACT is that callee. An ABSENT or EMPTY `receive() external payable {{}}` observes NOTHING, so a difference in WHEN state is written (before vs. after that call) can never be detected from outside. In that case give the test contract a LIVE `receive()`/`fallback()`: let it REVERT, or RE-ENTER `c` exactly ONCE behind a recursion guard, e.g. `bool private __entered; receive() external payable {{ if (!__entered) {{ __entered = true; c.<fn>(/* args */); }} }}`. Exactly ONE state-changing `c.<fn>(...)` statement is allowed inside the callback (at its top level or inside the guard branch) -- a second one is REJECTED. The callback may READ c freely.'),
    ],
}


# config.signature_cheatcodes (2026-09-22): the gates in orchestrate/concrete.py admit vm.sign / vm.addr
# under this flag, but the prompts still told the model "NO other vm.* cheatcodes", so it either avoided
# them (and could not reach a signature-gated entry at all) or used them and was rejected. These rewrites
# keep the published wording byte-identical when the flag is off. MEASURED: pop_032_PuttyV2 t1, 13 of the
# 18 attempts on the patched EIP-712 boundary `fillOrder` died as forbidden_cheatcode:vm.addr / vm.sign.
_SIG_CHEAT_REWRITES = {
    "test": ('`vm.startPrank`, `vm.stopPrank`, `vm.warp`, `vm.roll` to set up the concrete scenario — NO other vm.* cheatcodes (vm.expectRevert / vm.store / vm.mockCall etc. are REJECTED).',
             '`vm.startPrank`, `vm.stopPrank`, `vm.warp`, `vm.roll`, `vm.addr`, `vm.sign` to set up the concrete scenario — NO other vm.* cheatcodes (vm.expectRevert / vm.store / vm.mockCall etc. are REJECTED). When an entry point verifies a signature (ecrecover / EIP-712 / permit), producing a VALID signature is the only way to reach its body: pick a private key `k`, use `vm.addr(k)` as the signer address wherever the contract expects it, and `(uint8 v, bytes32 r, bytes32 s) = vm.sign(k, <digest>);` to sign the exact digest the contract recomputes.'),
}


def _sig_cheats(template: str, kind: str, on: bool) -> str:
    if not on:
        return template
    old, new = _SIG_CHEAT_REWRITES[kind]
    if old not in template:
        raise AssertionError("signature_cheatcodes: %s anchor missing" % kind)
    return template.replace(old, new, 1)


def _live_callback(template: str, kind: str, on: bool) -> str:
    """Return `template` unchanged when the lever is OFF (byte-identical official prompt), else apply
    the LIVE CALLBACK rewrites. Each anchor must occur EXACTLY once; a drifted anchor raises rather
    than silently producing the old prompt under a flag that says it changed."""
    if not on:
        return template
    out = template
    for old, new in _LIVE_CALLBACK_REWRITES[kind]:
        n = out.count(old)
        if n != 1:
            raise AssertionError(f"live-callback rewrite anchor occurs {n}x in {kind} prompt: {old[:60]!r}")
        out = out.replace(old, new)
    return out

def build_prompt_llm_test(contract_code: str, contract_name: str, change: str, modified_unit_code: str,
                          goal: str, boundary: str, import_path: str, pragma: str, construction: str,
                          test_memory: str, construction_body: str = "",
                          construction_decls: str = "", public_surface: str = "",
                          observer_helper: bool = False,
                          live_callback: bool = False, sig_cheats: bool = False,
                          file_types: str = "") -> list[dict]:
    # Defaults reproduce the one-expression setUp byte for byte, so an arm with no
    # construction fixtures sees the pre-change prompt exactly.
    construction_body = construction_body or f"c = {construction};"
    user = _sig_cheats(_live_callback(_observer(_PROMPT_LLM_TEST, "test", observer_helper), "test", live_callback), "test", sig_cheats).format(CONSTRUCTION_BODY=construction_body,
                                   CONSTRUCTION_DECLS=construction_decls,CONTRACT_CODE=contract_code, CONTRACT_NAME=contract_name, CHANGE=change,
                                   MODIFIED_UNIT_CODE=modified_unit_code, GOAL=goal, BOUNDARY=boundary,
                                   IMPORT_PATH=import_path, PRAGMA=pragma.strip(), CONSTRUCTION=construction,
                                   IMPORT_SYMBOLS=import_symbols(contract_name, construction, file_types),
                                   PUBLIC_SURFACE=(f"\n{public_surface}" if public_surface else ""),
                                   TEST_MEMORY=_fmt(test_memory))
    return [{"role": "system", "content": SYS_TEST}, {"role": "user", "content": user}]


def build_prompt_llm_test_reflect(contract_code: str, contract_name: str, change: str,
                                  modified_unit_code: str, goal: str, boundary: str, import_path: str,
                                  pragma: str, construction: str, test_memory: str, diag_kind: str,
                                  construction_body: str = "", construction_decls: str = "",
                                  public_surface: str = "", observer_helper: bool = False,
                                  live_callback: bool = False, sig_cheats: bool = False,
                                  file_types: str = "",
                                  **diag) -> list[dict]:
    diag_text = _LLM_TEST_DIAG[diag_kind].format(CONTRACT_NAME=contract_name, CONSTRUCTION=construction,
                                                 **{k: _fmt(v) for k, v in diag.items()})
    msgs = build_prompt_llm_test(contract_code, contract_name, change, modified_unit_code, goal, boundary,
                                 import_path, pragma, construction, test_memory,
                                 construction_body, construction_decls, public_surface, observer_helper,
                                 live_callback, sig_cheats, file_types)
    msgs[1]["content"] = diag_text + "\n\n" + msgs[1]["content"]
    return msgs


# --- Direct property-based testing: run_mode direct_pbt (RQ1 Direct-PBT) and no_mg (RQ3 ablation) ----
# No mutant, no counterexample, no Break direction: the model sees P and writes a property-based test that
# must hold on P (Hold) with a reachable oracle (Reach). CACHE LAYOUT: the system line and the whole first
# part of the user message (contract + template + constraints + response format) are byte-identical for
# every call of both arms on one case -- first attempt and every reflection -- so the provider's prefix
# cache serves them. Everything that varies (the focus, the memories, the previous attempt and its
# diagnosis) is appended at the END.
SYS_PBT = ("You write a Solidity property-based test. Its assertion must be a general rule that the given "
           "contract satisfies for every input.")

_PROMPT_PBT = """Here is a Solidity contract P ({CONTRACT_NAME}), shown FOR REFERENCE ONLY — it already \
exists in the compilation unit. Do NOT copy or re-declare it in your output:
{CONTRACT_CODE}

Your task is to write a property-based test for P: a test contract whose single public function takes \
input parameters, drives c, and ends with one assert stating a GENERAL RULE that P satisfies for ALL \
inputs. A checker will try to PROVE that the rule holds on P for every input, and will check that the \
assert is actually reached by some execution. Aim for a rule about what the contract is meant to \
guarantee — how a call changes c's state, what it returns, when it must or must not revert, how Ether \
moves — so that a faulty version of P would break it. A rule that only restates something trivially \
true is useless.

Fill in this template:

contract InvMutTest {{
    {CONTRACT_NAME} c;
    constructor({CONTRACT_NAME} _c) {{ c = _c; }}
    function run(/* params */) public payable {{
        require(/* fill in a precondition on the parameters if needed, otherwise leave */ true);
        // To send Ether, take the amount as a PARAMETER (e.g. `uint amount`) and call
        // c.f{{value: amount}}(...); NEVER read msg.value here. If you do, require
        // address(this).balance >= amount first.
        /* set up the state the rule needs with calls on c, read the before-values, make the deciding
           call; for a revert rule:
           bool reverted; try c.f(args) {{ reverted = false; }} catch {{ reverted = true; }} */
        assert(/* general rule over params, values read from c, and any revert flags */);
    }}
    receive() external payable {{ /* optional callback logic, if needed */ }}
}}

Constraints:
- Output ONLY the single contract named exactly InvMutTest. Do NOT define, copy, or re-declare \
{CONTRACT_NAME} or ANY other contract, interface, or library — they already exist in the compilation \
unit. Do NOT emit any pragma line or SPDX-License-Identifier comment. Your source is appended AFTER the \
existing code, so re-declaring {CONTRACT_NAME} (or repeating pragma/SPDX) causes an "identifier already \
declared" compile error and your test is discarded.
- Exactly one public function holds all the test logic. You may also define only a constructor, a \
receive, and a fallback. No other functions.
- Declare a state variable c of type {CONTRACT_NAME}, take it in the constructor, and interact only \
through c.
- Use input parameters; do not hard-code values.
- If Ether is needed, the function may be payable and may call c.f{{value: amount}}(...), with amount \
from a parameter, plus require(address(this).balance >= amount).
- Observe c ONLY through its PUBLIC/EXTERNAL surface: the auto-generated getters of its `public` state \
variables, its `public`/`external` view/pure functions and their return values, `address(c).balance` \
(value held by c) and `address(this).balance` (value received by the test), and revert booleans. Do NOT \
read ANY other member of c. A `private`/`internal` state variable has NO getter — writing `c.<name>(...)` \
for it causes a `Member "<name>" not found or not visible` compile error and your test is discarded. If \
the rule seems to need a non-public variable, re-express it through an observable effect instead: a \
public function's return value, a revert, or `address(c).balance`.
- The checker deploys a FRESH c and runs run(...) exactly ONCE as a single transaction; msg.sender is the \
InvMutTest contract for every call on c, and this contract deployed c. All setup must be calls at the top \
of run(...). Never require() a condition on c's state before the call that creates it.
- End with exactly one assert(<condition>): a formula over the parameters, values read/returned from c \
through that public surface, and any revert booleans. Not a constant, not a literal-vs-literal comparison, \
not assert(true). Avoid subtraction that can underflow inside the assert.
- No cheatcodes (no vm.*), hard-coded addresses, new deployments, or randomness.
{FLAT_SHAPE}

Respond with one JSON object and nothing else:
{{
  "property_summary": "<one short sentence stating the general rule>",
  "test_code": "<the Solidity source of the InvMutTest contract ONLY — no pragma, no SPDX, no other contract/interface definitions>"
}}"""

# What a reflection may change. There is no counterexample call sequence to keep, so the whole execution
# may be rewritten; no_mg keeps only its focus.
_PBT_REFLECT_FREE = ("You may rewrite any part of the test: the setup calls and their order, the parameters, "
                     "the require(...) preconditions (add, remove or change them) and the assertion.")
_PBT_REFLECT_FOCUS = ("You may rewrite any part of the test — the setup calls and their order, the parameters, "
                      "the require(...) preconditions (add, remove or change them) and the assertion — but "
                      "keep the FOCUS: the rule stays about the focus above and the deciding call still goes "
                      "through `{BOUNDARY}`.")
_PBT_NO_FOCUS = "No focus is given: choose any behaviour of P that is worth a rule."
_PBT_FOCUS = ("FOCUS for this test: write the rule about {FOCUS}, driving c through the public entry "
              "`{BOUNDARY}`.")

# P-only diagnoses. There is no mutant, so nothing here mentions one.
_PBT_DIAG = {
    "did_not_compile": ("Your previous test did not compile:\n{COMPILER_ERROR}\nFix it, keeping the same "
                        "rule."),
    "malformed_test": ("Your previous test was rejected by the shape checker: {FORM_REASON}. Every "
                       "state-changing call on c must be its OWN top-level statement — not nested in "
                       "if/for/while/try, not inside require/assert, and not through a helper, alias, cast, "
                       "or interface. Rewrite it in that flat shape, keeping the same rule."),
    "wrong_form": ("Your previous test had the wrong shape: {FORM_REASON}. Keep exactly one public function "
                   "with all the logic, plus at most a constructor, a receive, and a fallback."),
    "uses_msg_value": ("Your previous test read msg.value inside the function body. Remove it; take the "
                       "amount as a parameter instead (require(address(this).balance >= amount))."),
    "fails_on_original": ("Your previous rule does NOT hold on P: the checker found inputs on which P "
                          "violates it{WHERE}. Its counterexample:\n{COUNTEREXAMPLE}\nEither exclude those "
                          "inputs with a require(...) on the parameters, add setup calls that put c in the "
                          "state the rule needs (this test contract deployed c, so it holds any role the "
                          "constructor assigns), or correct the rule so P satisfies it for every input."),
    "non_target_failure": ("On P the run trapped BEFORE your assert, at {FAIL_WHERE}. That is not your rule "
                           "being violated. If the trap is in your own code it is most often an arithmetic "
                           "underflow/overflow (e.g. `before - amount` when the value is 0): rewrite without "
                           "the risky arithmetic. If it is inside c, avoid that call path. Keep the rule."),
    "unreachable": ("Your assert is NEVER REACHED on P: every execution stops earlier — at one of your "
                    "require(...) statements or at a revert inside c — so the test checks nothing. Typical "
                    "cause: a require on c's state placed before the call that establishes it, or a call "
                    "that always reverts from a fresh deployment. Set the state up with top-level calls "
                    "first, keep require(...) on the parameters only, and wrap a call that may revert in "
                    "try/catch and assert on the revert flag."),
    "inconclusive": ("The checker could not settle whether P satisfies your rule within its bounds. Make "
                     "the test simpler: fewer calls, one comparison, and require(...) bounds on the "
                     "parameters; keep the same rule."),
    "duplicate": ("Your previous test is the same test as one already ACCEPTED in this run. Write a "
                  "DIFFERENT rule."),
    "not_accepted_foundry": ("Your previous test was proved by the checker but FAILED when run in Foundry on "
                             "P:\n{FORGE_LOG}\nFix what made it fail there, keeping the same rule."),
}


def _pbt_tail(focus: str | None, boundary: str | None, accepted_memory: str, test_memory: str,
              previous_test: str | None, diag_kind: str | None, diag: dict) -> str:
    parts = ["=== THIS TEST ===",
             _PBT_FOCUS.format(FOCUS=focus, BOUNDARY=boundary) if focus else _PBT_NO_FOCUS,
             "",
             "Rules already ACCEPTED for P in this run — write a DIFFERENT rule, do not repeat them:",
             _fmt(accepted_memory),
             "",
             "Rules already tried for this test; do not repeat them:",
             _fmt(test_memory)]
    if diag_kind:
        scope = (_PBT_REFLECT_FOCUS.format(BOUNDARY=boundary) if focus else _PBT_REFLECT_FREE)
        parts += ["", "Your previous test:", previous_test or "(none)", "",
                  _PBT_DIAG[diag_kind].format(**{k: _fmt(v) for k, v in diag.items()}), scope]
    return "\n".join(parts)


def build_prompt_pbt(contract_code: str, contract_name: str, *, focus: str | None = None,
                     boundary: str | None = None, accepted_memory: str = "", test_memory: str = "",
                     previous_test: str | None = None, diag_kind: str | None = None,
                     **diag) -> list[dict]:
    """Direct-PBT / no_mg test prompt. `focus`=None is Direct-PBT; no_mg passes the focus text and entry.
    A reflection passes diag_kind (+ its fields) and the previous test; the shared prefix is unchanged."""
    head = _PROMPT_PBT.format(CONTRACT_CODE=contract_code, CONTRACT_NAME=contract_name,
                              FLAT_SHAPE=_FLAT_SHAPE)
    tail = _pbt_tail(focus, boundary, accepted_memory, test_memory, previous_test, diag_kind, diag)
    return [{"role": "system", "content": SYS_PBT}, {"role": "user", "content": head + "\n\n" + tail}]


def pbt_focus_text(target_json: dict, boundary: str) -> str:
    """The property focus of one (target y, boundary x) cell, phrased about P alone (no mutant): the
    observation Full's goal compares between P and M, stated as the thing the rule must be about."""
    cat = target_json.get("category")
    tgt = target_json.get("target", {}) or {}
    locus = tgt.get("locus", {}) or {}
    fn = (boundary or "").split("(")[0] or "the entry"
    if cat == "return":
        return f"the value returned by a call `{fn}(args)` that completes"
    if cat in ("revert", "explicit_revert"):
        return f"whether a call `{fn}(args)` reverts or completes, and on which inputs"
    var = locus.get("name") or (locus.get("canonical_name") or "v").split(".")[-1]
    kind = (tgt.get("state_type", {}) or {}).get("kind", "scalar")
    if kind == "mapping":
        return (f"the value of `{var}` at some key after a call to `{fn}(...)` completes (the key need not "
                f"be the caller's own)")
    if kind == "balance":
        return f"the Ether held by c (`address(c).balance`) after a call to `{fn}(...)` completes"
    return f"the value of state variable `{var}` after a call to `{fn}(...)` completes"
