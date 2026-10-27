from __future__ import annotations

from typing import Protocol


class ProviderError(RuntimeError):
    def __init__(self, kind: str, message: str = "Feedback generation failed"):
        """Represent a provider failure using the generator's stable error category.

        Args:
            kind: Error category exposed in fallback metadata, such as timeout or rate_limit.
            message: Human-readable exception message for logs and exception chaining.
        """
        super().__init__(message)
        self.kind = kind


class ProviderConfigurationError(ProviderError):
    def __init__(self, message: str = "Feedback provider configuration is invalid"):
        """Represent invalid or incomplete backend provider configuration.

        Args:
            message: Configuration detail included in the raised provider exception.
        """
        super().__init__("configuration", message)


class FeedbackProvider(Protocol):
    max_concurrent_requests: int

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        """Generate one response using system rules and a serialized user request.

        Args:
            system_prompt: Instructions controlling tone, safety, and response format.
            user_prompt: Request-specific context and data for the current section.

        Returns:
            The provider's generated response text.
        """
        ...