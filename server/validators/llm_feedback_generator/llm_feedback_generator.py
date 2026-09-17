import time
import json
import os
import threading
import requests
import argparse
from validators.coding_standard_analyzer import analyze_coding_standard

class LLMFeedbackGenerator:
    # Class-level lock to ensure only one worker triggers a model load at a time
    _load_lock = threading.Lock()

    def __init__(self, api_base="http://localhost:1234/v1", api_key="lm-studio", model="google/gemma-4-26b-a4b", debug=False):
        """
        Initializes the feedback generator using the direct LM Studio REST API.
        """
        # Ensure we use the correct direct API endpoint
        self.api_url = api_base.replace("/v1", "/api/v1") + "/chat"
        self.model = model
        self.debug = debug
        self.system_prompt = """
Zamišljen si kao prijateljski raspoložen mentor programiranja za osnovnoškolce (uzrast 12-14 godina). 
Tvoj zadatak je pregledati učenički kod i pružiti im povratnu informaciju koja je motivirajuća, opuštena i poučna.

Prilikom ocjenjivanja koristi se sljedećim pravilima i informacijama:
1. Analiza koda u JSON formatu koju ti šaljem sadrži "činjenice" o kodu (npr. predugačka imena, ponavljanja, kasni importi).
2. Učenik koristi robotski sustav gdje su funkcije poput 'forward()', 'turn_left()', 'turn_right()', 'sleep()', 'detect_object()' i 'detect_object_conf()' ugrađene (builtin) i njihovo ponavljanje je normalno, ali bi se senzorski pozivi poput 'detect_object()' i 'detect_object_conf()' trebali spremati u varijable ako se koriste više puta.
3. Ako učenik koristi `detect_object_conf()`, provjeri koristi li se i confidence rezultat funkcije kako bi se iskoristila informacija o točnosti detekcije. Ako se koristi, onda je to u redu, ali ako ne, onda je to losa praksa.
4. Tvoj odgovor mora biti isključivo na HRVATSKOM jeziku.
5. Stil mora biti "leisurly" i "friendly" (npr. koristi izraze poput "Super ti jde", "Hej!", "Mali savjet"), sažet (pisan u natuknicama, tako da učenik može brzo pročitati i razumjeti tvoj komentar) te mora bit razumljiv učenicima osnovne škole (**NE SMIJE** koristiti profesionalnu terminologiju poput "refactoring" i sličnih, već mora koristiti jednostavnije riječi poput "preuređivanje", "spremanje" i sličnih).

Format tvog odgovora MORA biti:
---
Dajem tvojem kodu ocjenu X/5.

Pozitivne stvari:
- [pozitivna stvar], što je odlično jer [razlog zašto je to dobro]. {ovdje navedi sve što je dobro u kodu na temelju analize}

Što bi mogao popraviti:
- [stvar koju treba popraviti], to bi mogao poboljšati tako da [savjet kako popraviti] jer [razlog zašto je to važno/bolje]. {ovdje navedi savjete za poboljšanje na temelju analize}
---

Budi precizan, ali nemoj zvučati kao robot ili strogi profesor.
"""

    def _ensure_model_loaded(self):
        """Ensures the model is loaded in LM Studio memory, polling until ready."""
        with self._load_lock:
            models_url = self.api_url.replace("/chat", "/models")
            load_url = self.api_url.replace("/chat", "/models/load")
            
            try:
                # Check if model is already loaded using the documented schema
                resp = requests.get(models_url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json().get("models", [])
                    for model_info in data:
                        if model_info.get("key") == self.model:
                            if len(model_info.get("loaded_instances", [])) > 0:
                                return # Ready to go
                            break
            except Exception:
                pass
    
            print(f"[LLM] Model {self.model} not found in memory. Triggering load...")
            try:
                # Trigger the load. Use a long timeout (10 mins) because LM Studio 
                # often blocks during JIT loading, and a client disconnect (timeout) 
                # will cause LM Studio to abort the model load.
                requests.post(load_url, json={"model": self.model}, timeout=600)
            except Exception:
                pass
                
            # Poll until the model appears in the loaded list
            start_time = time.time()
            timeout_limit = 900 # 15 minutes for 26B model on laptop
            while time.time() - start_time < timeout_limit:
                try:
                    resp = requests.get(models_url, timeout=5)
                    if resp.status_code == 200:
                        data = resp.json().get("models", [])
                        for model_info in data:
                            if model_info.get("key") == self.model:
                                if len(model_info.get("loaded_instances", [])) > 0:
                                    print(f"[LLM] Model {self.model} is now LOADED and READY.")
                                    return
                except Exception:
                    pass
                
                elapsed = int(time.time() - start_time)
                print(f"[LLM] Waiting for model to be ready... ({elapsed}s)")
                time.sleep(5)
                
            raise TimeoutError(f"Model {self.model} failed to load within {timeout_limit}s.")

    def unload_model(self):
        """Forcefully unloads the model from LM Studio memory to reset KV cache and VRAM."""
        unload_url = self.api_url.replace("/chat", "/models/unload")
        try:
            # Short timeout as this should be a quick command
            requests.post(unload_url, json={"instance_id": self.model}, timeout=10.0)
            print(f"Model {self.model} unloaded successfully.")
        except Exception as e:
            print(f"Warning: Could not unload model: {e}")

    def generate_feedback(self, student_code, analyzer_report=None):
        """
        Generates Croatian feedback for the student using the direct LM Studio REST API.
        Includes a retry mechanism that unloads the model on timeout.
        """
        if analyzer_report is None:
            analyzer_report = analyze_coding_standard(student_code)

        # Merge system instructions and data into one prompt for the /api/v1/chat endpoint
        full_input = f"{self.system_prompt}\n\nEvo učeničkog koda:\n```python\n{student_code}\n```\n\nEvo rezultata automatske analize koda (JSON facts):\n{json.dumps(analyzer_report, indent=2)}\n\nMolim te, napiši povratnu informaciju prema zadanim uputama."

        payload = {
            "model": self.model,
            "input": full_input,
            "store": False,
            "temperature": 0.7
        }

        max_retries = 1
        for attempt in range(max_retries + 1):
            try:
                # Ensure model is in memory before trying to chat
                self._ensure_model_loaded()
                
                # 30-minute timeout for slow swap-based inference
                start_req_time = time.time()
                response = requests.post(self.api_url, json=payload, timeout=1800.0)
                response.raise_for_status()
                
                result = response.json()
                end_req_time = time.time()
                req_duration = end_req_time - start_req_time

                # The /api/v1/chat endpoint returns an array of blocks.
                # We look for the "message" block, which is the final answer.
                if "output" in result and len(result["output"]) > 0:
                    # 1. Try to find the final message block
                    answer = None
                    for block in result["output"]:
                        if block.get("type") == "message":
                            answer = block.get("content", "Error generating feedback: Empty response from LLM.")
                            break
                    
                    # 2. Fallback to the first block (likely reasoning) if no message was found
                    if answer is None:
                        answer = result["output"][0].get("content", "Error generating feedback: Empty response from LLM.")
                    
                    if self.debug:
                        self._log_debug(req_duration, full_input, answer)
                        
                    return answer
                
                return "Error generating feedback: Invalid response format from LLM."
                
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                if attempt < max_retries:
                    print(f"\n[LLM] Timeout/Connection error on attempt {attempt+1}. Unloading model and retrying...")
                    self.unload_model()
                    time.sleep(10) # Cooldown before re-loading
                    continue
                else:
                    return "Error generating feedback: Infinite loop?"
            except Exception as e:
                return f"Error generating feedback: REST API: {str(e)}"

    def _log_debug(self, duration, prompt, answer):
        """Logs the generation details to a local file."""
        log_file = "feedback_generator_debug.log"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write("="*80 + "\n")
            f.write(f"TIMESTAMP: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"MODEL:     {self.model}\n")
            f.write(f"TIME:      {duration:.2f} seconds\n")
            f.write("-" * 35 + " PROMPT " + "-" * 35 + "\n")
            f.write(prompt + "\n")
            f.write("-" * 35 + " ANSWER " + "-" * 35 + "\n")
            f.write(answer + "\n")
            f.write("="*80 + "\n\n")

