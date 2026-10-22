"""
Shared broker token manager using Redis.
Allows multiple Gunicorn workers to share the same broker authentication token.
"""
import os
import json
import logging
import redis
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class BrokerTokenManager:
    """Manages broker authentication token shared across workers via Redis."""

    REDIS_KEY = "broker:token"
    TOKEN_TTL = 9999  # 1 hour

    def __init__(self):
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis: {redis_url}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Falling back to local state.")
            self.redis_client = None

    def get_token(self) -> Optional[Dict[str, str]]:
        """
        Get the current broker token from Redis.
        Returns dict with 'client_id' and 'token', or None if not found.
        """
        if not self.redis_client:
            return None

        try:
            data = self.redis_client.get(self.REDIS_KEY)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get token from Redis: {e}")

        return None

    def save_token(self, client_id: str, token: str) -> bool:
        """
        Save broker token to Redis with TTL.
        Returns True if successful, False otherwise.
        """
        if not self.redis_client:
            return False

        try:
            data = json.dumps({
                "client_id": client_id,
                "token": token,
            })
            self.redis_client.setex(self.REDIS_KEY, self.TOKEN_TTL, data)
            logger.info(f"Saved broker token to Redis (client_id: {client_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to save token to Redis: {e}")
            return False

    def clear_token(self) -> bool:
        """Clear the broker token from Redis."""
        if not self.redis_client:
            return False

        try:
            self.redis_client.delete(self.REDIS_KEY)
            logger.info("Cleared broker token from Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to clear token from Redis: {e}")
            return False

    def is_available(self) -> bool:
        """Check if Redis is available."""
        return self.redis_client is not None


# Singleton instance
_token_manager: Optional[BrokerTokenManager] = None


def get_token_manager() -> BrokerTokenManager:
    """Get the singleton token manager instance."""
    global _token_manager
    if _token_manager is None:
        _token_manager = BrokerTokenManager()
    return _token_manager
