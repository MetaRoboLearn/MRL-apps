from __future__ import annotations

import httpx
import random
import time
from typing import Any

from google import genai
from google.genai import errors, types

from .protocol import ProviderError


class GoogleAiStudioProvider:
    max_concurrent_requests = 4

    def __init__(self, api_key: str, model: str):
        """Create a Gemini client for the selected project and model.

        Args:
            api_key: Google AI Studio credential used to authenticate provider requests.
            model: Gemini model identifier passed to each content-generation call.
        """
        self.model = model
        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=60_000),
        )

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        """Generate text from separate system instructions and user context.

        Args:
            system_prompt: Mode rules and constraints supplied as Gemini's system instruction.
            user_prompt: Serialized request context supplied as the generation content.

        Returns:
            Non-empty generated text with surrounding whitespace removed.

        Raises:
            ProviderError: When the API times out, rejects the request, or returns no text.
        """
        # Spread concurrent section requests to reduce Gemini 503 overload bursts.
        time.sleep(random.uniform(0.5, 1.0))
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