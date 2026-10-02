
from __future__ import annotations

import re

SYS_MUTATION = ("You modify a Solidity contract. You make one small change so that a chosen, externally "
                "visible behavior of the contract differs from the original.")
SYS_TEST = ("You write a Solidity test contract. Its assertion must be a general rule that the original "
            "contract satisfies and a given modified version breaks.")

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
    diag_text = _B_DIAG[diag_kind].format(**diag)
    msgs = build_prompt_a(contract_code, editable_units, goal, mutation_memory, avoid_statements)
    msgs[1]["content"] = diag_text + "\n\n" + msgs[1]["content"]
    return msgs


def build_prompt_c(contract_code: str, contract_name: str, change: str, modified_unit_code: str,
                   difference: str, test_memory: str, call_sequence: list | None = None,
                   category: str | None = None, template: str = "full",
                   during_call: bool = False, observer_getter: str | None = None) -> list[dict]:
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


_REQUIRE_TIGHTEN = ("The test FAILS on P itself: for some inputs P already violates the asserted rule. A "
                    "counterexample is shown below. ADD or TIGHTEN a `require(...)` precondition at the "
                    "start of the function so those inputs are excluded and the rule holds on P.")
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
    else:
        info_block = ""
    user = _PROMPT_REQUIRE.format(CONTRACT_NAME=contract_name, CONTRACT_CODE=contract_code,
                                  TEST_CODE=test_code, DIRECTIVE=directive, EDIT_RULE=edit_rule,
                                  COUNTEREXAMPLE_BLOCK=info_block, FLAT_SHAPE=_FLAT_SHAPE,
                                  TEST_MEMORY=_fmt(test_memory))
    return [{"role": "system", "content": SYS_TEST}, {"role": "user", "content": user}]



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
    if not on:
        return template
    out = template
    for old, new in _MUTATE_COVERAGE_REWRITES:
        n = out.count(old)
        if n != 1:
            raise AssertionError(f"mutate coverage anchor occurs {n}x: {old[:60]!r}")
        out = out.replace(old, new)
    return out


_MUTATE_CALLORDER_REWRITES = [
    ('Each mutant must differ from P by exactly ONE single-statement edit — rewrite, delete, insert, or move one statement (a reorder is one move, not two edits) — made only inside the body of one of these units:',
     'Each mutant must differ from P by exactly ONE single-statement edit — rewrite, delete, insert, or move one statement (a reorder is one move, not two edits) — made only inside the body of one of these units: CALL-ORDER MOVES: when a unit makes an external call (`.call{{value: ...}}(...)`, `.transfer(...)`, `.send(...)`, or a call on a contract-typed state variable), the move operation also applies to the state updates AROUND that call: moving a state update from BEFORE the call to AFTER it, or from after to before, is exactly ONE move. It changes only WHEN the state is written — indistinguishable to an observer that reads the state after the call returns, but plainly different to the callee while the call is still in progress, and to any caller the callee re-enters. Whenever a unit contains BOTH an external call and a state update, emit that move as one of its distinct behaviours.'),
]


def _mutate_callorder(template: str, on: bool) -> str:
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
    user = _mutate_callorder(_mutate_coverage(_PROMPT_LLM_MUTATE_BATCH, statement_coverage),
                             call_order).format(
                                           CONTRACT_CODE=contract_code, EDITABLE_UNITS=editable_units,
                                           GOAL=goal, BOUNDARIES=boundaries,
                                           PRECONDITION_NOTE=precondition_note)
    if patch_diff:
        user += _DIFF_ANCHOR_SUFFIX.format(PATCH_DIFF=patch_diff[:6000])
    if fewshot:
        user += fewshot
    return [{"role": "system", "content": SYS_MUTATION}, {"role": "user", "content": user}]


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


_FORGE_STD_EXPORTS = frozenset({
    "Test", "TestBase", "StdAssertions", "StdChains", "StdCheats", "StdCheatsSafe", "StdInvariant",
    "StdUtils", "StdStorage", "StdStyle", "StdError", "CommonBase", "ScriptBase", "Script",
    "Vm", "VmSafe", "console", "console2", "safeconsole", "stdError", "stdJson", "stdMath",
    "stdStorage", "stdStorageSafe",
})

_TOP_LEVEL_DECL = re.compile(
    r"^(?:abstract\s+)?(?:interface|library|contract|struct|enum|type)\s+([A-Za-z_]\w*)", re.M)


def file_level_types(source: str, contract_name: str) -> list[str]:
    out, seen = [], {contract_name}
    for m in _TOP_LEVEL_DECL.finditer(source or ""):
        n = m.group(1)
        if n in seen or n in _FORGE_STD_EXPORTS:
            continue
        seen.add(n)
        out.append(n)
    return out


def import_symbols(contract_name: str, construction: str, file_types: str = "") -> str:
    deps = [t for t in re.findall(r"\bnew\s+([A-Z]\w*)\s*\(", construction or "") if t != contract_name]
    deps += [t.strip() for t in (file_types or "").split(",") if t.strip()]
    seen, out = {contract_name}, [contract_name]
    for d in deps:
        if d not in seen:
            seen.add(d)
            out.append(d)
    return ", ".join(out)


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
    if not on:
        return template
    out = template
    for old, new in _OBSERVER_REWRITES[kind]:
        n = out.count(old)
        if n != 1:
            raise AssertionError(f"observer rewrite anchor occurs {n}x in {kind} prompt: {old[:60]!r}")
        out = out.replace(old, new)
    return out


_LIVE_CALLBACK_REWRITES = {
    "test": [
        ('    function testRegression_property() public {{\n        // 1. (optional) vm.deal/vm.prank/vm.warp to set up the specific scenario\n        // 2. if state is needed, write 1+ concrete `c.<fn>(...)` statements IN ORDER, ending at `{BOUNDARY}`\n        // 3. exactly one assertTrue(<concrete fact reading c>) the reference holds and the bug breaks\n    }}\n}}{CONSTRUCTION_DECLS}', '    function testRegression_property() public {{\n        // 1. (optional) vm.deal/vm.prank/vm.warp to set up the specific scenario\n        // 2. if state is needed, write 1+ concrete `c.<fn>(...)` statements IN ORDER, ending at `{BOUNDARY}`\n        // 3. exactly one assertTrue(<concrete fact reading c>) the reference holds and the bug breaks\n    }}\n    // (optional) LIVE CALLBACK -- include ONLY when the CONTROLLED CALLEE rule applies; omit otherwise:\n    // bool private __entered;\n    // receive() external payable {{ if (!__entered) {{ __entered = true; c.<fn>(/* args */); }} }}\n}}{CONSTRUCTION_DECLS}'),
        ('- The contract MUST be named exactly `InvMutTest`, inherit `Test`. Keep the two imports and SPDX/pragma EXACTLY. Do NOT re-declare/copy/import {CONTRACT_NAME}; define no other contract/interface/library.', '- The contract MUST be named exactly `InvMutTest`, inherit `Test`. Keep the two imports and SPDX/pragma EXACTLY. Do NOT re-declare/copy/import {CONTRACT_NAME}; define no other contract/interface/library.\n- CONTROLLED CALLEE: if the unit shown above sends value or makes a low-level call BACK to its caller (`msg.sender.call{{value: ...}}("")`, `.transfer(...)`, `.send(...)`) or to an address the caller supplied, then THIS TEST CONTRACT is that callee. An ABSENT or EMPTY `receive() external payable {{}}` observes NOTHING, so a difference in WHEN state is written (before vs. after that call) can never be detected from outside. In that case give the test contract a LIVE `receive()`/`fallback()`: let it REVERT, or RE-ENTER `c` exactly ONCE behind a recursion guard, e.g. `bool private __entered; receive() external payable {{ if (!__entered) {{ __entered = true; c.<fn>(/* args */); }} }}`. Exactly ONE state-changing `c.<fn>(...)` statement is allowed inside the callback (at its top level or inside the guard branch) -- a second one is REJECTED. The callback may READ c freely.'),
    ],
}


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

_PBT_REFLECT_FREE = ("You may rewrite any part of the test: the setup calls and their order, the parameters, "
                     "the require(...) preconditions (add, remove or change them) and the assertion.")
_PBT_REFLECT_FOCUS = ("You may rewrite any part of the test — the setup calls and their order, the parameters, "
                      "the require(...) preconditions (add, remove or change them) and the assertion — but "
                      "keep the FOCUS: the rule stays about the focus above and the deciding call still goes "
                      "through `{BOUNDARY}`.")
_PBT_NO_FOCUS = "No focus is given: choose any behaviour of P that is worth a rule."
_PBT_FOCUS = ("FOCUS for this test: write the rule about {FOCUS}, driving c through the public entry "
              "`{BOUNDARY}`.")

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
    head = _PROMPT_PBT.format(CONTRACT_CODE=contract_code, CONTRACT_NAME=contract_name,
                              FLAT_SHAPE=_FLAT_SHAPE)
    tail = _pbt_tail(focus, boundary, accepted_memory, test_memory, previous_test, diag_kind, diag)
    return [{"role": "system", "content": SYS_PBT}, {"role": "user", "content": head + "\n\n" + tail}]


def pbt_focus_text(target_json: dict, boundary: str) -> str:
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
