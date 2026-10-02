"""Doc 2 §6.3 — single-file R2 assembly with AST-guided contract renaming.

Produces the shared-deps preamble plus two renamed copies of the primary contract C (C_ref from
P, C_mut from M) so both can coexist in one file with a single shared copy of their dependencies.
Renaming is AST-guided (only tokens whose `referencedDeclaration` resolves to C, never blind
string replace). A dependency that itself references C is the §6.3 inheritance/usage edge —
unsupported in v1 and reported, not mis-assembled."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from invmut.esbmc.runner import temp_sol
from invmut.mutation.solast import AstError, ContractInfo, analyze_contract, byte_slice, parse_src, get_ast, _walk


@dataclass
class AssemblyParts:
    deps: str
    c_ref: str
    c_mut: str
    ref_name: str
    mut_name: str
    p_info: ContractInfo
    m_info: ContractInfo


@dataclass
class AssemblyError:
    reason: str
    unsupported: bool = True   # a v1 limitation (→ inconclusive/report-back), not a hard bug


def _toplevel_names(ast: dict) -> set[str]:
    names: set[str] = set()
    su = ast
    for n in su.get("nodes", []) if isinstance(su, dict) else []:
        nt = n.get("nodeType")
        if nt in ("ContractDefinition", "StructDefinition", "EnumDefinition",
                  "UserDefinedValueTypeDefinition", "FunctionDefinition", "ErrorDefinition"):
            if n.get("name"):
                names.add(n["name"])
    return names


def _pick_suffixes(existing: set[str], contract: str) -> tuple[str, str]:
    """§6.3 step 3: collision-free ref/mut names. Try _ref/_mut, then __invmut_ref/_mut, then
    numbered, until BOTH are unique among the file's top-level declarations."""
    candidates = [
        (f"{contract}_ref", f"{contract}_mut"),
        (f"__invmut_ref_{contract}", f"__invmut_mut_{contract}"),
    ]
    for i in range(2, 50):
        candidates.append((f"{contract}_ref{i}", f"{contract}_mut{i}"))
    for ref, mut in candidates:
        if ref not in existing and mut not in existing and ref != mut:
            return ref, mut
    raise AstError("could not find collision-free rename suffix")


def _rename_within(text: str, span_start: int, global_spans: list[tuple[int, int]],
                   new_name: str) -> str:
    """Replace each DISTINCT global span (all containing the contract name) with new_name, working
    on the local `text` extracted from `span_start`. Spans are DEDUPED by (start,end) — the AST
    can list the same token twice (a UserDefinedTypeName and its inner IdentifierPath share src),
    which would otherwise double-apply to `C_ref_ref` (codex F5). Descending order preserves
    offsets."""
    # spans are global BYTE offsets; `text` was byte-sliced from `span_start`, so local offsets index
    # `text`'s bytes. Apply in byte space (str slicing misaligns once non-ASCII appears upstream).
    uniq = {(a - span_start, b - span_start) for a, b in global_spans}
    bt = text.encode("utf-8")
    nn = new_name.encode("utf-8")
    for a, b in sorted(uniq, key=lambda t: t[0], reverse=True):
        bt = bt[:a] + nn + bt[b:]
    return bt.decode("utf-8")


def _rename_many_within(
    text: str,
    span_start: int,
    replacements: list[tuple[int, int, str]],
) -> str:
    """Apply AST-token replacements inside one extracted top-level declaration."""
    by_span: dict[tuple[int, int], str] = {}
    for start, end, new_name in replacements:
        local = (start - span_start, end - span_start)
        previous = by_span.get(local)
        if previous is not None and previous != new_name:
            raise AstError(f"conflicting replacements at source span {start}:{end}")
        by_span[local] = new_name
    data = text.encode("utf-8")
    for (start, end), new_name in sorted(by_span.items(), reverse=True):
        data = data[:start] + new_name.encode("utf-8") + data[end:]
    return data.decode("utf-8")


def _contract_nodes(ast: dict) -> dict[int, dict]:
    return {
        int(node["id"]): node
        for node in ast.get("nodes", [])
        if isinstance(node, dict)
        and node.get("nodeType") == "ContractDefinition"
        and isinstance(node.get("id"), int)
    }


def _inheritance_closure(ast: dict, contract: str) -> list[dict]:
    nodes = _contract_nodes(ast)
    target = next((node for node in nodes.values() if node.get("name") == contract), None)
    if target is None:
        raise AstError(f"contract {contract!r} not found in AST")
    closure_ids = set(target.get("linearizedBaseContracts") or [target["id"]])
    missing = closure_ids - set(nodes)
    if missing:
        raise AstError(f"inheritance closure contains missing contract ids: {sorted(missing)}")
    return sorted((nodes[cid] for cid in closure_ids), key=lambda node: parse_src(node["src"])[0])


def _outside_closure_references(
    ast: dict,
    source: str,
    closure: list[dict],
) -> list[tuple[int, int]]:
    names = {int(node["id"]): str(node.get("name") or "") for node in closure}
    spans = [parse_src(node["src"]) for node in closure]
    outside: list[tuple[int, int]] = []
    for node in _walk(ast):
        if not isinstance(node, dict) or node.get("referencedDeclaration") not in names:
            continue
        if "src" not in node:
            continue
        start, end = parse_src(node["src"])
        if byte_slice(source, start, end) != names[node["referencedDeclaration"]]:
            continue
        if not any(left <= start and end <= right for left, right in spans):
            outside.append((start, end))
    return outside


def _original_closure_keep_ids(
    ast: dict,
    source: str,
    closure: list[dict],
) -> set[int]:
    """Original closure members needed by declarations outside the copied closure.

    These originals remain as shared P-side compatibility definitions.  Ref/mut
    copies are still independently renamed and are the only copies instantiated
    by the differential Harness.
    """
    closure_by_id = {int(node["id"]): node for node in closure}
    closure_spans = [parse_src(node["src"]) for node in closure]
    keep: set[int] = set()
    for node in _walk(ast):
        if not isinstance(node, dict) or "src" not in node:
            continue
        ref = node.get("referencedDeclaration")
        if ref not in closure_by_id:
            continue
        start, end = parse_src(node["src"])
        if byte_slice(source, start, end) != str(closure_by_id[ref].get("name") or ""):
            continue
        if not any(left <= start and end <= right for left, right in closure_spans):
            keep.add(int(ref))

    changed = True
    while changed:
        changed = False
        for cid in list(keep):
            contract_node = closure_by_id[cid]
            required = set(contract_node.get("linearizedBaseContracts") or []) & set(closure_by_id)
            for node in _walk(contract_node):
                if not isinstance(node, dict) or "src" not in node:
                    continue
                ref = node.get("referencedDeclaration")
                if ref not in closure_by_id:
                    continue
                start, end = parse_src(node["src"])
                if byte_slice(source, start, end) == str(closure_by_id[ref].get("name") or ""):
                    required.add(int(ref))
            new_ids = required - keep
            if new_ids:
                keep.update(new_ids)
                changed = True
    return keep


def _source_without_spans(source: str, spans: list[tuple[int, int]]) -> str:
    data = source.encode("utf-8")
    chunks: list[bytes] = []
    cursor = 0
    for start, end in sorted(spans):
        chunks.append(data[cursor:start])
        cursor = end
    chunks.append(data[cursor:])
    return b"".join(chunks).decode("utf-8").rstrip() + "\n"


def _renamed_closure_text(
    ast: dict,
    source: str,
    closure: list[dict],
    names: dict[str, str],
) -> str:
    id_to_name = {int(node["id"]): str(node.get("name") or "") for node in closure}
    replacements: list[tuple[int, int, str]] = []
    for node in closure:
        start, end = parse_src(node["nameLocation"])
        replacements.append((start, end, names[str(node["name"])]))
    for node in _walk(ast):
        if not isinstance(node, dict) or "src" not in node:
            continue
        ref = node.get("referencedDeclaration")
        if ref not in id_to_name:
            continue
        start, end = parse_src(node["src"])
        old_name = id_to_name[ref]
        if byte_slice(source, start, end) == old_name:
            replacements.append((start, end, names[old_name]))

    definitions: list[str] = []
    for node in closure:
        start, end = parse_src(node["src"])
        local_replacements = [
            replacement for replacement in replacements
            if start <= replacement[0] and replacement[1] <= end
        ]
        definitions.append(_rename_many_within(
            byte_slice(source, start, end), start, local_replacements
        ))
    return "\n\n".join(definitions)


def _analyze(solc_bin: str, source: str, contract: str) -> ContractInfo:
    with temp_sol(source, prefix="invmut_asm_") as path:
        return analyze_contract(solc_bin, source, path, contract)


def assemble_pair(
    solc_bin: str, p_source: str, m_source: str, contract: str
) -> AssemblyParts | AssemblyError:
    """Build the renamed (deps, C_ref, C_mut) parts for the R2 file. Returns AssemblyError on a
    v1-unsupported shape (dep references C, or AST failure)."""
    try:
        p_info = _analyze(solc_bin, p_source, contract)
        m_info = _analyze(solc_bin, m_source, contract)
    except AstError as e:
        return AssemblyError(f"ast_analysis_failed: {e}")

    if p_info.external_ref_spans or m_info.external_ref_spans:
        return AssemblyError("dependency references the primary contract "
                             "(inheritance/usage edge, Doc 2 §6.3 v1 limitation)")

    # self-typed / contract-internal-typed PUBLIC API: a param/return of type C, or of an enum/
    # struct declared INSIDE C, would need to be C_ref-typed for p and C_mut-typed for m at once —
    # one harness value cannot satisfy both, and the duplicated types are distinct (codex F5/B3).
    # Unsupported in v1 (the rename dedup above only prevents the crash; the type split is the
    # real blocker). File-level shared types are fine (single unrenamed copy).
    blocked = {contract} | set(p_info.internal_types)
    for f in p_info.entries:
        types = [t for t, _ in f.params] + list(f.returns)
        for ty in types:
            base = ty.split()[0].split(".")[-1] if ty else ""   # strip location + `C.` qualifier
            if base in blocked:
                return AssemblyError(
                    f"entry {f.name!r} uses a contract-internal type {base!r} in its signature "
                    "(C_ref/C_mut would diverge, Doc 2 §6.3 v1 limitation)")

    try:
        with temp_sol(p_source, prefix="invmut_names_") as path:
            existing = _toplevel_names(get_ast(solc_bin, path))
        ref_name, mut_name = _pick_suffixes(existing, contract)
    except AstError as e:
        return AssemblyError(f"ast_analysis_failed: {e}")

    pcs, pce = p_info.span
    mcs, mce = m_info.span
    # spans are BYTE offsets into the source — slice/concatenate in byte space (str slicing misaligns
    # once the source carries any non-ASCII byte upstream, e.g. © in a comment).
    c_ref = _rename_within(byte_slice(p_source, pcs, pce), pcs,
                           [p_info.name_loc, *p_info.self_ref_spans], ref_name)
    c_mut = _rename_within(byte_slice(m_source, mcs, mce), mcs,
                           [m_info.name_loc, *m_info.self_ref_spans], mut_name)
    # deps = P minus C's span (M's deps are identical: the edit is confined to C's body).
    pb = p_source.encode("utf-8")
    deps = (pb[:pcs] + pb[pce:]).decode("utf-8").rstrip() + "\n"

    return AssemblyParts(deps, c_ref, c_mut, ref_name, mut_name, p_info, m_info)


def assemble_inheritance_pair(
    solc_bin: str,
    p_source: str,
    m_source: str,
    contract: str,
) -> AssemblyParts | AssemblyError:
    """Duplicate the target's complete inheritance closure on both sides.

    `assemble_pair` intentionally shares every dependency.  That is correct only
    when the edit is inside the primary contract.  A frozen candidate may instead
    edit an inherited base function or modifier.  This variant duplicates every
    contract in C's linearized inheritance closure, rewrites only AST-resolved
    contract-name tokens, and rejects any source difference outside that closure.
    """
    try:
        p_info = _analyze(solc_bin, p_source, contract)
        m_info = _analyze(solc_bin, m_source, contract)
        with temp_sol(p_source, prefix="invmut_inherit_p_") as p_path:
            p_ast = get_ast(solc_bin, p_path)
        with temp_sol(m_source, prefix="invmut_inherit_m_") as m_path:
            m_ast = get_ast(solc_bin, m_path)
        # Interfaces carry no storage and no executable implementation.  Keep
        # them shared so copied contracts remain type-compatible with shared
        # controllers/libraries whose APIs use those interface types.
        p_closure = [
            node for node in _inheritance_closure(p_ast, contract)
            if node.get("contractKind") != "interface"
        ]
        m_closure = [
            node for node in _inheritance_closure(m_ast, contract)
            if node.get("contractKind") != "interface"
        ]
    except AstError as error:
        return AssemblyError(f"ast_analysis_failed: {error}")

    p_names = [str(node.get("name") or "") for node in p_closure]
    m_names = [str(node.get("name") or "") for node in m_closure]
    if p_names != m_names:
        return AssemblyError("P/M inheritance closures differ")
    p_spans = [parse_src(node["src"]) for node in p_closure]
    m_spans = [parse_src(node["src"]) for node in m_closure]
    p_outside = _source_without_spans(p_source, p_spans)
    m_outside = _source_without_spans(m_source, m_spans)
    if p_outside != m_outside:
        return AssemblyError("P/M sources differ outside the inheritance closure")
    original_keep = _original_closure_keep_ids(p_ast, p_source, p_closure)
    p_remove = [
        parse_src(node["src"]) for node in p_closure if int(node["id"]) not in original_keep
    ]
    p_deps = _source_without_spans(p_source, p_remove)

    existing = _toplevel_names(p_ast)
    ref_names: dict[str, str] = {}
    mut_names: dict[str, str] = {}
    for name in p_names:
        ref_name, mut_name = _pick_suffixes(existing, name)
        existing.update({ref_name, mut_name})
        ref_names[name] = ref_name
        mut_names[name] = mut_name
    try:
        c_ref = _renamed_closure_text(p_ast, p_source, p_closure, ref_names)
        c_mut = _renamed_closure_text(m_ast, m_source, m_closure, mut_names)
    except AstError as error:
        return AssemblyError(f"inheritance_rename_failed: {error}")

    # A candidate routed here must actually alter a member of the duplicated
    # closure.  Otherwise P/M would again be identical modulo copy names.
    p_raw = "\n\n".join(
        byte_slice(p_source, *parse_src(node["src"])) for node in p_closure
    )
    m_raw = "\n\n".join(
        byte_slice(m_source, *parse_src(node["src"])) for node in m_closure
    )
    if p_raw == m_raw:
        return AssemblyError("source mutation absent from inheritance closure")

    return AssemblyParts(
        p_deps,
        c_ref,
        c_mut,
        ref_names[contract],
        mut_names[contract],
        p_info,
        m_info,
    )
