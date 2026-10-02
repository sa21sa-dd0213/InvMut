"""Doc 5 §4 — the LLM access layer (OpenAI-compatible; DeepSeek by default).

Two-level structure (§4): a `chat()` call is one `llm_call_id`; the agent layer wraps multiple chat()
calls into one `attempt_id` on JSON-parse retries. Failures are classified into the §4 taxonomy so the
orchestrator can keep infra errors OUT of the mutation/test budgets:

  - transient (5xx / network / read timeout)  -> LLMInfraError("api_error")      [0 budget, resumable]
  - sustained 429                              -> LLMInfraError("rate_limit")     [0 budget, resumable]
  - 401/403                                    -> LLMInfraError("auth_error")     [abort the run]

The resolved API key is NEVER stored in any artefact (§3 secrets discipline) — only the env var NAME is in
config. The key is read from the process env (`api_key_env`); if absent we parse the known key file
(`~/.veriexploit_deepseek_key`, an `export NAME="..."` snippet) so a run never silently dies on a missing
ambient env (ERRORS #140: explicit path, never $PATH guesswork).

reasoning_effort sentinel: the DeepSeek API REJECTS `reasoning_effort="none"` (HTTP 400); the field must be
OMITTED for non-thinking. We treat {none,"",null} as omit (evidence: notes/evidence/deepseek_param_matrix.json).

PROVIDER ROUTING (DEVIATIONS V34): a `qwen*` model name routes to Alibaba DashScope's OpenAI-compatible
endpoint (its own base_url + `QWEN_API_KEY` from `~/.qwen_apikey`), independent of the DeepSeek config block.
Qwen uses a DIFFERENT no-thinking convention: `extra_body={"enable_thinking": False}` (NOT DeepSeek's
`{"thinking":{"type":"disabled"}}`) and never accepts `reasoning_effort`. Endpoint clients are built lazily
per provider, so a pure-Qwen run never needs the DeepSeek key (and vice-versa)."""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass, field
from typing import Optional

from invmut.config import Config

_DEFAULT_KEY_FILE = os.path.expanduser("~/.veriexploit_deepseek_key")
_OMIT_EFFORT = {None, "", "none", "None"}
_MAX_TRANSIENT_RETRIES = 4
_BACKOFF_BASE_S = 2.0

# Provider routing (DEVIATIONS V34). A model whose name matches a provider prefix is sent to that
# provider's OpenAI-compatible endpoint with its own key file + env var, regardless of the config llm block.
_QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
_QWEN_KEY_FILE = os.path.expanduser("~/.qwen_apikey")
_QWEN_API_KEY_ENV = "QWEN_API_KEY"

# OpenAI GPT-5 family (RQ4). Own endpoint + key file, like Qwen — hardcoded here so the config llm block
# (base_url/api_key_env) need not change; reasoning_effort/service_tier/temperature still come from config.
# GPT-5 reasoning models require `max_completion_tokens` (reject `max_tokens`) and accept `service_tier`
# ("flex" = cheaper/slower) and `reasoning_effort` ("none"/"minimal"/"low"/"medium"/"high") verbatim.
_OPENAI_BASE_URL = "https://api.openai.com/v1"
_OPENAI_KEY_FILE = os.path.expanduser("~/.veriexploit_openai_key")
_OPENAI_API_KEY_ENV = "OPENAI_API_KEY"
# Zhipu GLM (RQ4 backend, 2026-09-28). OpenAI-compatible endpoint; no-thinking is DeepSeek's
# `{"thinking":{"type":"disabled"}}`; `reasoning_effort` is never sent. The key file holds the bare key.
_GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
_GLM_KEY_FILE = os.path.expanduser("~/.invmut-glm")
_GLM_API_KEY_ENV = "GLM_API_KEY"


def provider_of(model: Optional[str]) -> str:
    """Which endpoint family a model name belongs to. 'qwen' -> DashScope; 'gpt-'/'o1'/'o3'/'o4' -> OpenAI;
    else 'default' (config llm block)."""
    m = (model or "").lower()
    if m.startswith("qwen"):
        return "qwen"
    if m.startswith("gpt-") or m.startswith("o1") or m.startswith("o3") or m.startswith("o4"):
        return "openai"
    if m.startswith("glm"):
        return "glm"
    return "default"


class LLMDeadline(RuntimeError):
    """The cell's hard deadline (LLMClient.hard_deadline) left no time for another request. Not an
    infrastructure failure: the caller ends the current attempt and lets the cell finish normally."""


class LLMInfraError(RuntimeError):
    """A non-scientific infrastructure failure (§4): consumes 0 budget. `kind` ∈ {api_error, rate_limit,
    auth_error}. auth_error should abort the whole run; the others mark the unit dirty (resumable)."""

    def __init__(self, kind: str, detail: str = ""):
        super().__init__(f"{kind}: {detail}")
        self.kind = kind
        self.detail = detail


@dataclass
class LLMResult:
    content: str
    reasoning_content: str
    llm_call_id: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    reasoning_tokens: int = 0
    prompt_cache_hit_tokens: int = 0   # DeepSeek prefix-cache hits (input @ 0.02 vs miss @ 1.00) — for cost f
    elapsed_s: float = 0.0
    thinking: bool = False
    finish_reason: str = ""   # "stop" | "length" (truncated) | ... — lets callers detect cut-off output


def resolve_api_key(api_key_env: str, key_file: str = _DEFAULT_KEY_FILE) -> str:
    """env[api_key_env] if set, else parse `export <name>="..."` from the key file. Never logged."""
    val = os.environ.get(api_key_env)
    if val:
        return val.strip()
    if os.path.exists(key_file):
        text = open(key_file).read()
        m = re.search(rf'{re.escape(api_key_env)}\s*=\s*["\']?([^"\'\s]+)', text)
        if m:
            return m.group(1).strip()
    raise LLMInfraError("auth_error", f"no API key in env ${api_key_env} or {key_file}")


def _resolve_bare_key(api_key_env: str, key_file: str) -> str:
    """env[api_key_env] if set, else the key file's whole content when it is one bare token. Never logged."""
    val = os.environ.get(api_key_env)
    if val:
        return val.strip()
    if os.path.exists(key_file):
        text = open(key_file).read().strip()
        if text and not any(ch.isspace() for ch in text) and "=" not in text:
            return text
        return resolve_api_key(api_key_env, key_file)
    raise LLMInfraError("auth_error", f"no API key in env ${api_key_env} or {key_file}")


def _is_thinking(extra_body: Optional[dict]) -> bool:
    eb = extra_body or {}
    if eb.get("thinking", {}).get("type") == "enabled":   # DeepSeek convention
        return True
    return eb.get("enable_thinking") is True               # Qwen / DashScope convention


class LLMClient:
    """Thin wrapper over the OpenAI SDK. One instance per run; thread-safe for concurrent agents
    (the SDK client is). `call_seq` is a monotonic id source for llm_call_id."""

    def __init__(self, config: Config, key_file: str = _DEFAULT_KEY_FILE):
        self.cfg = config
        self.llm = config.llm
        self._key_file = key_file
        self._seq = 0
        self._clients: dict = {}   # provider -> OpenAI; built lazily on first use (per-provider keys)
        # 0 = SDK default (600 s). See _client_for and config.llm_request_timeout_s.
        self.request_timeout_s = int(getattr(config, "llm_request_timeout_s", 0) or 0)
        # Optional per-request timing log (JSONL; set by scripts/run_case.py). Observation only: one line per
        # HTTP request -- elapsed time, outcome, and token counts -- so a cell's wall can be split into
        # provider stalls vs pipeline work without recording host timestamps.
        self.call_log: Optional[str] = None
        import threading
        self._call_log_lock = threading.Lock()

    def _log_call(self, **rec) -> None:
        if not self.call_log:
            return
        import json
        try:
            with self._call_log_lock, open(self.call_log, "a") as f:
                f.write(json.dumps(rec) + "\n")
        except OSError:
            pass

    def _client_for(self, provider: str):
        """Lazily build (and cache) the OpenAI SDK client for a provider. A Qwen-only run never resolves
        the DeepSeek key and vice-versa, because each endpoint client is built only on first use."""
        if provider in self._clients:
            return self._clients[provider]
        from openai import OpenAI
        # Per-request wall. Without it the SDK default (600 s) applies, and with
        # llm.service_tier = "flex" one queued request can hold the whole case wall; the
        # resulting APITimeoutError is already transient-retried below. 0 = SDK default.
        rt = int(getattr(self, "request_timeout_s", 0) or 0)
        kw = {"timeout": float(rt)} if rt > 0 else {}
        if provider == "qwen":
            key = resolve_api_key(_QWEN_API_KEY_ENV, _QWEN_KEY_FILE)
            c = OpenAI(api_key=key, base_url=_QWEN_BASE_URL, **kw)
        elif provider == "openai":
            key = resolve_api_key(_OPENAI_API_KEY_ENV, _OPENAI_KEY_FILE)
            c = OpenAI(api_key=key, base_url=_OPENAI_BASE_URL, **kw)
        elif provider == "glm":
            key = _resolve_bare_key(_GLM_API_KEY_ENV, _GLM_KEY_FILE)
            c = OpenAI(api_key=key, base_url=_GLM_BASE_URL, **kw)
        else:
            key = resolve_api_key(self.llm.api_key_env, self._key_file)
            c = OpenAI(api_key=key, base_url=self.llm.base_url, **kw)
        self._clients[provider] = c
        return c

    @staticmethod
    def _backoff(attempt: int, hd) -> float:
        """Transient-retry backoff, never sleeping past the hard deadline."""
        b = _BACKOFF_BASE_S * (2 ** attempt)
        return max(0.0, min(b, hd - time.time() - 2.0)) if hd is not None else b

    def _next_id(self) -> str:
        self._seq += 1
        return f"L{self._seq:07d}"

    def chat(self, messages: list[dict], *, model: Optional[str] = None,
             reasoning_effort: Optional[str] = None, thinking: Optional[bool] = None,
             temperature: Optional[float] = None, max_tokens: int = 4096) -> LLMResult:
        """One chat completion with bounded transient-retry. Raises LLMInfraError on exhausted/auth.

        `thinking`/`reasoning_effort` override the config defaults when given. `thinking=True` sets
        extra_body thinking enabled (and keeps reasoning_effort); `thinking=False` disables it AND omits
        reasoning_effort (else the API 400s).

        INVMUT_FORBID_LLM=1 makes this raise instead of calling out (UPLIFT_PLAN.md §4.1, the H4
        mechanism): a run that must be zero-LLM -- an ablation replay, a GT precheck -- then cannot
        spend a token by accident. It is a physical block, not a promise."""
        if os.environ.get("INVMUT_FORBID_LLM") == "1":
            raise LLMInfraError("forbidden", "INVMUT_FORBID_LLM=1: this run must not call the LLM")
        from openai import APIStatusError, APIConnectionError, APITimeoutError, RateLimitError

        llm = self.llm
        mdl = model or llm.model
        temp = llm.temperature if temperature is None else temperature
        provider = provider_of(mdl)
        oai = self._client_for(provider)

        # resolve thinking / reasoning_effort — per-provider convention
        openai_effort = None
        if provider == "qwen":
            # DashScope compatible-mode: toggle via extra_body.enable_thinking; never send reasoning_effort.
            if thinking is None:
                enable = bool((llm.extra_body or {}).get("enable_thinking", False))
            else:
                enable = bool(thinking)
            extra_body = {"enable_thinking": enable}
            eff = None
        elif provider == "openai":
            # GPT-5 family: no DeepSeek thinking extra_body. reasoning_effort is passed VERBATIM (incl.
            # "none"/"minimal") from the explicit arg or config — NOT zeroed by thinking=False (that's a
            # DeepSeek convention). max_completion_tokens + service_tier handled in the kwargs block below.
            extra_body = {}
            eff = None
            openai_effort = reasoning_effort if reasoning_effort is not None else llm.reasoning_effort
            # gpt-5-mini has no "none" tier (HTTP 400) — its floor is "minimal". Map the DeepSeek-style
            # "none"/unset request to the lowest OpenAI reasoning tier (user RQ4: reasoning_effort=none).
            if openai_effort in _OMIT_EFFORT:
                openai_effort = "minimal"
        elif thinking is None:
            extra_body = dict(llm.extra_body or {})
            eff = reasoning_effort if reasoning_effort is not None else llm.reasoning_effort
        elif thinking:
            extra_body = {"thinking": {"type": "enabled"}}
            eff = reasoning_effort or "high"
        else:
            extra_body = {"thinking": {"type": "disabled"}}
            eff = None

        if provider == "glm":
            # GLM: thinking is whatever the config's extra_body says (glm-5.2 no-think sends
            # {"thinking":{"type":"disabled"}}; glm-5.3-flash always thinks and 400s on "disabled"), so the
            # per-call `thinking` flag is ignored.  reasoning_effort (low/high/max) goes out verbatim.
            extra_body = dict(llm.extra_body or {})
            eff = reasoning_effort if reasoning_effort is not None else llm.reasoning_effort

        if provider == "openai":
            # GPT-5 reasoning models reject `max_tokens` (require `max_completion_tokens`); reasoning_effort
            # is sent as-is (incl. "none"); service_tier comes from the selected model configuration.
            kwargs = dict(model=mdl, messages=messages, stream=False, temperature=temp,
                          max_completion_tokens=max_tokens)
            if getattr(llm, "service_tier", None):
                kwargs["service_tier"] = llm.service_tier
            if openai_effort not in (None, ""):
                kwargs["reasoning_effort"] = openai_effort
        else:
            kwargs = dict(model=mdl, messages=messages, stream=False, temperature=temp,
                          max_tokens=max_tokens)
            if extra_body:
                kwargs["extra_body"] = extra_body
            if eff not in _OMIT_EFFORT:
                kwargs["reasoning_effort"] = eff

        call_id = self._next_id()
        last = None
        # hard_deadline (epoch s, set by the Direct-PBT/no_mg arms to the cell's scoring deadline): no
        # request, retry or backoff may outlive it.  Without this a flex-queued request issued just before
        # the generation deadline waited up to request_timeout_s x retries and the launcher's 660 s kill
        # voided the whole cell (Direct-PBT gpt-5-mini, 2026-09-29: 14 of 41 cells).
        hd = getattr(self, "hard_deadline", None)
        rt_cfg = float(getattr(self, "request_timeout_s", 0) or 0) or 600.0
        for attempt in range(_MAX_TRANSIENT_RETRIES + 1):
            if hd is not None:
                left = hd - time.time()
                if left < 2.0:
                    raise LLMDeadline(f"{left:.1f}s left before the cell deadline")
                kwargs["timeout"] = min(rt_cfg, left)
            t0 = time.monotonic()
            try:
                # under a hard deadline the SDK's own retries (default 2, each waiting the full timeout)
                # would multiply the wait past it; the loop here does the (deadline-bounded) retrying
                r = (oai.with_options(max_retries=0) if hd is not None else oai).chat.completions.create(**kwargs)
            except Exception as e:
                self._log_call(call_id=call_id, attempt=attempt, model=mdl,
                               elapsed_s=round(time.monotonic() - t0, 2), outcome=type(e).__name__,
                               status=getattr(e, "status_code", None), detail=str(e)[:160])
                if not isinstance(e, (RateLimitError, APIStatusError, APIConnectionError, APITimeoutError)):
                    raise
                _exc = e
            else:
                _exc = None
            try:
                if _exc is not None:
                    raise _exc
            except RateLimitError as e:
                last = e
                if attempt < _MAX_TRANSIENT_RETRIES:
                    time.sleep(self._backoff(attempt, hd))
                    continue
                raise LLMInfraError("rate_limit", str(e)[:200])
            except APIStatusError as e:
                code = getattr(e, "status_code", None)
                if code in (401, 403):
                    raise LLMInfraError("auth_error", str(e)[:200])
                last = e
                if code and 500 <= code < 600 and attempt < _MAX_TRANSIENT_RETRIES:
                    time.sleep(self._backoff(attempt, hd))
                    continue
                # other 4xx (e.g. a malformed request) is not transient — surface as api_error
                raise LLMInfraError("api_error", f"HTTP {code}: {str(e)[:200]}")
            except (APIConnectionError, APITimeoutError) as e:
                last = e
                if hd is not None and hd - time.time() < 2.0:
                    raise LLMDeadline(f"request timed out at the cell deadline: {str(e)[:120]}")
                if attempt < _MAX_TRANSIENT_RETRIES:
                    time.sleep(self._backoff(attempt, hd))
                    continue
                raise LLMInfraError("api_error", str(e)[:200])

            elapsed = time.monotonic() - t0
            msg = r.choices[0].message
            usage = r.usage
            self._log_call(call_id=call_id, attempt=attempt, model=mdl,
                           elapsed_s=round(elapsed, 2), outcome="ok",
                           prompt=getattr(usage, "prompt_tokens", 0) or 0,
                           completion=getattr(usage, "completion_tokens", 0) or 0,
                           reasoning=(getattr(getattr(usage, "completion_tokens_details", None),
                                              "reasoning_tokens", 0) or 0) if usage else 0,
                           cached=(getattr(getattr(usage, "prompt_tokens_details", None), "cached_tokens", 0)
                                   or getattr(usage, "prompt_cache_hit_tokens", 0) or 0) if usage else 0,
                           finish=getattr(r.choices[0], "finish_reason", "") or "")
            rtoks = 0
            if usage and usage.completion_tokens_details:
                rtoks = usage.completion_tokens_details.reasoning_tokens or 0
            return LLMResult(
                content=msg.content or "",
                reasoning_content=getattr(msg, "reasoning_content", None) or "",
                llm_call_id=call_id, model=mdl,
                prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
                completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
                reasoning_tokens=rtoks,
                # DeepSeek reports cache hits as a flat `prompt_cache_hit_tokens`; OpenAI reports
                # them as `usage.prompt_tokens_details.cached_tokens`.  Reading only the DeepSeek
                # field made every gpt-5-mini run report 0 cached input, so the discount that
                # automatic prefix caching already gives was invisible in the cost accounting.
                prompt_cache_hit_tokens=(getattr(usage, "prompt_cache_hit_tokens", 0) or 0)
                or (getattr(getattr(usage, "prompt_tokens_details", None),
                            "cached_tokens", 0) or 0),
                elapsed_s=elapsed,
                thinking=_is_thinking(extra_body),
                finish_reason=getattr(r.choices[0], "finish_reason", "") or "",
            )
        raise LLMInfraError("api_error", str(last)[:200])
