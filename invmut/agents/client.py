
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

_QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
_QWEN_KEY_FILE = os.path.expanduser("~/.qwen_apikey")
_QWEN_API_KEY_ENV = "QWEN_API_KEY"

_OPENAI_BASE_URL = "https://api.openai.com/v1"
_OPENAI_KEY_FILE = os.path.expanduser("~/.veriexploit_openai_key")
_OPENAI_API_KEY_ENV = "OPENAI_API_KEY"
_GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
_GLM_KEY_FILE = os.path.expanduser("~/.invmut-glm")
_GLM_API_KEY_ENV = "GLM_API_KEY"


def provider_of(model: Optional[str]) -> str:
    m = (model or "").lower()
    if m.startswith("qwen"):
        return "qwen"
    if m.startswith("gpt-") or m.startswith("o1") or m.startswith("o3") or m.startswith("o4"):
        return "openai"
    if m.startswith("glm"):
        return "glm"
    return "default"


class LLMDeadline(RuntimeError):
    pass


class LLMInfraError(RuntimeError):

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
    prompt_cache_hit_tokens: int = 0
    elapsed_s: float = 0.0
    thinking: bool = False
    finish_reason: str = ""


def resolve_api_key(api_key_env: str, key_file: str = _DEFAULT_KEY_FILE) -> str:
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
    if eb.get("thinking", {}).get("type") == "enabled":
        return True
    return eb.get("enable_thinking") is True


class LLMClient:

    def __init__(self, config: Config, key_file: str = _DEFAULT_KEY_FILE):
        self.cfg = config
        self.llm = config.llm
        self._key_file = key_file
        self._seq = 0
        self._clients: dict = {}
        self.request_timeout_s = int(getattr(config, "llm_request_timeout_s", 0) or 0)
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
        if provider in self._clients:
            return self._clients[provider]
        from openai import OpenAI
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
        b = _BACKOFF_BASE_S * (2 ** attempt)
        return max(0.0, min(b, hd - time.time() - 2.0)) if hd is not None else b

    def _next_id(self) -> str:
        self._seq += 1
        return f"L{self._seq:07d}"

    def chat(self, messages: list[dict], *, model: Optional[str] = None,
             reasoning_effort: Optional[str] = None, thinking: Optional[bool] = None,
             temperature: Optional[float] = None, max_tokens: int = 4096) -> LLMResult:
        if os.environ.get("INVMUT_FORBID_LLM") == "1":
            raise LLMInfraError("forbidden", "INVMUT_FORBID_LLM=1: this run must not call the LLM")
        from openai import APIStatusError, APIConnectionError, APITimeoutError, RateLimitError

        llm = self.llm
        mdl = model or llm.model
        temp = llm.temperature if temperature is None else temperature
        provider = provider_of(mdl)
        oai = self._client_for(provider)

        openai_effort = None
        if provider == "qwen":
            if thinking is None:
                enable = bool((llm.extra_body or {}).get("enable_thinking", False))
            else:
                enable = bool(thinking)
            extra_body = {"enable_thinking": enable}
            eff = None
        elif provider == "openai":
            extra_body = {}
            eff = None
            openai_effort = reasoning_effort if reasoning_effort is not None else llm.reasoning_effort
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
            extra_body = dict(llm.extra_body or {})
            eff = reasoning_effort if reasoning_effort is not None else llm.reasoning_effort

        if provider == "openai":
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
                prompt_cache_hit_tokens=(getattr(usage, "prompt_cache_hit_tokens", 0) or 0)
                or (getattr(getattr(usage, "prompt_tokens_details", None),
                            "cached_tokens", 0) or 0),
                elapsed_s=elapsed,
                thinking=_is_thinking(extra_body),
                finish_reason=getattr(r.choices[0], "finish_reason", "") or "",
            )
        raise LLMInfraError("api_error", str(last)[:200])
