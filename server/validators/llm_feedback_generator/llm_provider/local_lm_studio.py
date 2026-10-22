import logging
import threading
import time

import requests

from .protocol import ProviderError

logger = logging.getLogger(__name__)


class LocalLmStudioProvider:
    _load_lock = threading.Lock()
    max_concurrent_requests = 4

    def __init__(self, api_base: str, model: str):
        self.api_url = api_base.replace("/v1", "/api/v1") + "/chat"
        self.model = model
        self._request_condition = threading.Condition()
        self._active_requests = 0
        self._unloading = False

    def _begin_request(self) -> None:
        with self._request_condition:
            while self._unloading:
                self._request_condition.wait()
            self._active_requests += 1

    def _end_request(self) -> None:
        with self._request_condition:
            self._active_requests -= 1
            self._request_condition.notify_all()

    def _unload_when_idle(self) -> None:
        with self._request_condition:
            self._unloading = True
            while self._active_requests:
                self._request_condition.wait()
        try:
            self.unload_model()
        finally:
            with self._request_condition:
                self._unloading = False
                self._request_condition.notify_all()

    def _ensure_model_loaded(self) -> None:
        logger.debug("Ensuring LM Studio model is loaded: model=%s", self.model)
        with self._load_lock:
            models_url = self.api_url.replace("/chat", "/models")
            load_url = self.api_url.replace("/chat", "/models/load")
            try:
                response = requests.get(models_url, timeout=10)
                if response.status_code == 200:
                    for model_info in response.json().get("models", []):
                        if model_info.get("key") == self.model:
                            if model_info.get("loaded_instances"):
                                return
                            break
            except Exception:
                logger.exception("Failed to inspect LM Studio model state: model=%s", self.model)

            logger.info("Loading LM Studio model: model=%s", self.model)
            try:
                requests.post(load_url, json={"model": self.model}, timeout=600)
            except Exception:
                logger.exception("Failed to trigger LM Studio model load: model=%s", self.model)

            start_time = time.time()
            timeout_limit = 900
            while time.time() - start_time < timeout_limit:
                try:
                    response = requests.get(models_url, timeout=5)
                    if response.status_code == 200:
                        for model_info in response.json().get("models", []):
                            if model_info.get("key") == self.model and model_info.get("loaded_instances"):
                                logger.info("LM Studio model is ready: model=%s", self.model)
                                return
                except Exception:
                    logger.debug("LM Studio readiness check failed", exc_info=True)
                time.sleep(5)

            raise TimeoutError(f"Model {self.model} failed to load within {timeout_limit}s.")

    def unload_model(self) -> None:
        unload_url = self.api_url.replace("/chat", "/models/unload")
        try:
            requests.post(unload_url, json={"instance_id": self.model}, timeout=10.0)
            logger.info("LM Studio model unloaded: model=%s", self.model)
        except Exception:
            logger.warning("Could not unload LM Studio model: model=%s", self.model, exc_info=True)

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self.model,
            "input": f"{system_prompt}\n\n{user_prompt}",
            "store": False,
            "temperature": 0.7,
        }

        for attempt in range(2):
            try:
                self._begin_request()
                try:
                    self._ensure_model_loaded()
                    response = requests.post(self.api_url, json=payload, timeout=1800.0)
                    response.raise_for_status()
                    output = response.json().get("output", [])
                finally:
                    self._end_request()
                if not output:
                    raise ProviderError("invalid_response")

                answer = next(
                    (block.get("content", "") for block in output if block.get("type") == "message"),
                    output[0].get("content", ""),
                )
                if not isinstance(answer, str) or not answer.strip():
                    raise ProviderError("invalid_response")
                return answer.strip()
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as error:
                if attempt == 0:
                    logger.warning("LM Studio request failed; retrying once: model=%s", self.model)
                    self._unload_when_idle()
                    time.sleep(10)
                    continue
                raise ProviderError("timeout") from error
            except TimeoutError as error:
                raise ProviderError("timeout") from error
            except requests.exceptions.HTTPError as error:
                status_code = error.response.status_code if error.response is not None else None
                kind = "provider"
                if status_code in (401, 403):
                    kind = "authentication"
                elif status_code == 429:
                    kind = "rate_limit"
                raise ProviderError(kind) from error
            except ProviderError:
                raise
            except Exception as error:
                logger.exception("LM Studio feedback request failed: model=%s", self.model)
                raise ProviderError("provider") from error

        raise ProviderError("timeout")