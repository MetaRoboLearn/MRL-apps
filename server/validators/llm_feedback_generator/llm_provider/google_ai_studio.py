from __future__ import annotations

import httpx
import time
from typing import Any

from google import genai
from google.genai import errors, types

from .protocol import ProviderError


class GoogleAiStudioProvider:
    max_concurrent_requests = 4

    def __init__(self, api_key: str, model: str):
        self.model = model
        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=60_000),
        )

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        response: Any = None
        for attempt in range(2):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.5,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True,
                        ),
                    ),
                )
                break
            except httpx.TimeoutException as error:
                raise ProviderError("timeout") from error
            except errors.APIError as error:
                if error.code in (500, 502, 503, 504) and attempt == 0:
                    time.sleep(1)
                    continue
                kind = {
                    401: "authentication",
                    403: "authentication",
                    408: "timeout",
                    429: "rate_limit",
                    504: "timeout",
                }.get(error.code, "provider")
                raise ProviderError(kind) from error
            except TimeoutError as error:
                raise ProviderError("timeout") from error
            except Exception as error:
                raise ProviderError("provider") from error

        if response is None:
            raise ProviderError("invalid_response")

        text = getattr(response, "text", None)
        if not isinstance(text, str) or not text.strip():
            raise ProviderError("invalid_response")
        return text.strip()