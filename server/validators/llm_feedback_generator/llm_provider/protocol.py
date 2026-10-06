from __future__ import annotations

from typing import Protocol


class ProviderError(RuntimeError):
    def __init__(self, kind: str, message: str = "Feedback generation failed"):
        super().__init__(message)
        self.kind = kind


class ProviderConfigurationError(ProviderError):
    def __init__(self, message: str = "Feedback provider configuration is invalid"):
        super().__init__("configuration", message)


class FeedbackProvider(Protocol):
    max_concurrent_requests: int

    def generate_text(self, system_prompt: str, user_prompt: str) -> str: ...