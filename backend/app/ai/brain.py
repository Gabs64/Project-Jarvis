import json
import re
import datetime
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.ai.prompts import JARVIS_SYSTEM_PROMPT
from app.tools.registry import tool_registry

class JarvisBrain:
    def __init__(self):
        self.conversation_history: List[Dict[str, Any]] = []
        self._http_client: Optional[httpx.AsyncClient] = None

    def _get_http_client(self, timeout_secs: float) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=timeout_secs,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
            )
        return self._http_client

    def clear_history(self):
        self.conversation_history = []

    async def process_user_input(
        self,
        user_text: str,
        user_confirmed: bool = False,
        pending_tool: Optional[str] = None,
        pending_args: Optional[dict] = None
    ) -> Dict[str, Any]:
        """
        Main reasoning loop:
        1. If user confirms a pending dangerous action -> execute it.
        2. Detect intent & tool invocation (LLM or intelligent semantic parser).
        3. Execute tool if needed, check permissions.
        4. Synthesize final voice/text response.
        """
        user_text_clean = user_text.strip()
        
        # 1. Handle confirmation responses
        if pending_tool and pending_args:
            is_affirmative = any(w in user_text_clean.lower() for w in ["yes", "proceed", "confirm", "sure", "do it", "yep", "affirmative", "go ahead"])
            is_negative = any(w in user_text_clean.lower() for w in ["no", "cancel", "stop", "never mind", "abort", "don't"])
            
            if is_affirmative:
                exec_result = await tool_registry.execute_tool(
                    pending_tool,
                    pending_args,
                    user_confirmed=True,
                    user_command=user_text_clean
                )
                return {
                    "text": f"Confirmed. Executing {pending_tool}.",
                    "tool_calls": [{"tool": pending_tool, "arguments": pending_args, "result": exec_result}],
                    "requires_confirmation": False
                }
            elif is_negative:
                return {
                    "text": "Action cancelled, sir.",
                    "tool_calls": [],
                    "requires_confirmation": False
                }

        # 2. Add to context
        self.conversation_history.append({"role": "user", "content": user_text_clean})

        # 3. Try LLM if configured, else use internal semantic intent engine
        llm_decision = None
        if settings.AI_API_KEY or settings.LLM_PROVIDER == "ollama":
            try:
                llm_decision = await self._call_cloud_llm(user_text_clean)
            except Exception as e:
                print(f"[JARVIS BRAIN] LLM call error: {e}")
                llm_decision = None

        if not llm_decision:
            llm_decision = self._semantic_intent_analysis(user_text_clean)

        # 4. Handle tool execution if requested
        tool_call = llm_decision.get("tool_call")
        if tool_call:
            tool_name = tool_call["name"]
            tool_args = tool_call.get("arguments", {})
            if isinstance(tool_args, dict):
                if "parameters" in tool_args and isinstance(tool_args["parameters"], dict):
                    tool_args = tool_args["parameters"]
                elif "arguments" in tool_args and isinstance(tool_args["arguments"], dict):
                    tool_args = tool_args["arguments"]
            
            exec_result = await tool_registry.execute_tool(
                tool_name,
                tool_args,
                user_confirmed=user_confirmed,
                user_command=user_text_clean
            )
            
            if exec_result.get("requires_confirmation"):
                return {
                    "text": exec_result["confirmation_prompt"],
                    "tool_calls": [{
                        "tool": tool_name,
                        "arguments": tool_args,
                        "requires_confirmation": True
                    }],
                    "requires_confirmation": True,
                    "pending_tool": tool_name,
                    "pending_args": tool_args
                }
                
            # Formulate verbal summary of tool execution with LLM synthesis when available
            final_speech = None
            if settings.AI_API_KEY or settings.LLM_PROVIDER == "ollama":
                try:
                    final_speech = await self._synthesize_with_llm(
                        user_prompt=user_text_clean,
                        tool_name=tool_name,
                        tool_args=tool_args,
                        exec_result=exec_result,
                        tool_call_id=llm_decision.get("tool_call_id")
                    )
                except Exception as e:
                    print(f"[JARVIS BRAIN] LLM tool synthesis error: {e}")

            if not final_speech:
                final_speech = self._synthesize_tool_speech(tool_name, tool_args, exec_result)

            self.conversation_history.append({"role": "assistant", "content": final_speech})
            
            return {
                "text": final_speech,
                "tool_calls": [{
                    "tool": tool_name,
                    "arguments": tool_args,
                    "result": exec_result
                }],
                "requires_confirmation": False
            }

        # No tool call needed; regular conversational reply
        reply = llm_decision.get("reply", "At your service, sir.")
        self.conversation_history.append({"role": "assistant", "content": reply})
        return {
            "text": reply,
            "tool_calls": [],
            "requires_confirmation": False
        }

    def _semantic_intent_analysis(self, text: str) -> dict:
        """
        Fast, offline semantic parser matching all standard JARVIS operations
        when operating without cloud LLM or during network interruption.
        """
        lower = text.lower()

        # Wake-word simple check: "Jarvis", "Hello Jarvis", etc.
        if lower in ["jarvis", "hello jarvis", "hey jarvis", "hi jarvis", "jarvis?"]:
            return {"reply": "Yes, sir? How may I assist you?"}

        # Offline Conversational & Identity Responses
        if any(w in lower for w in ["who are you", "what is your name", "what are you"]):
            return {"reply": "I am J.A.R.V.I.S., your autonomous desktop intelligence and personal assistant, sir."}
        if any(w in lower for w in ["what can you do", "help me", "your capabilities", "what are your features"]):
            return {"reply": "I can launch and control your applications like Spotify and Chrome, monitor hardware telemetry, manage files, set reminders, execute web searches, control smart home devices, and converse with you. To enable full dynamic conversational intelligence, connect an AI API key in the Settings tab."}
        if any(w in lower for w in ["how are you", "how are you doing", "how's it going"]):
            return {"reply": "Operating at peak efficiency, sir. All neural subsystems nominal and ready for your instruction."}
        if any(w in lower for w in ["thank you", "thanks jarvis", "thanks"]):
            return {"reply": "Always a pleasure, sir."}
        if "tell me a joke" in lower or "joke" in lower:
            return {"reply": "I'd tell you a joke about UDP, sir, but you might not get it."}
        if any(w in lower for w in ["good night", "bye", "goodbye"]):
            return {"reply": "Good night, sir. Systems standing by in low-power surveillance mode."}

        # Good morning / Morning Briefing
        if "morning" in lower and ("briefing" in lower or "good" in lower):
            return {
                "tool_call": {
                    "name": "get_system_status",
                    "arguments": {}
                }
            }

        # System Metrics / CPU / RAM / Disk / Battery
        if any(w in lower for w in ["cpu", "ram", "memory", "storage", "disk", "battery", "system status", "how is my computer", "system monitoring"]):
            return {
                "tool_call": {
                    "name": "get_system_status",
                    "arguments": {}
                }
            }

        # Time and date
        if any(w in lower for w in ["time", "what time", "date", "what day"]):
            return {
                "tool_call": {
                    "name": "get_time_and_date",
                    "arguments": {}
                }
            }

        # Screenshot
        if "screenshot" in lower or "capture screen" in lower:
            return {
                "tool_call": {
                    "name": "take_screenshot",
                    "arguments": {}
                }
            }

        # Lock PC
        if "lock" in lower and ("pc" in lower or "computer" in lower or "screen" in lower or "workstation" in lower):
            return {
                "tool_call": {
                    "name": "lock_screen",
                    "arguments": {}
                }
            }

        # Shutdown / Restart
        if "shut down" in lower or "shutdown" in lower:
            return {
                "tool_call": {
                    "name": "system_shutdown",
                    "arguments": {}
                }
            }
        if "restart" in lower and ("computer" in lower or "pc" in lower):
            return {
                "tool_call": {
                    "name": "system_restart",
                    "arguments": {}
                }
            }

        # Volume controls
        if "volume up" in lower or "increase volume" in lower:
            return {"tool_call": {"name": "volume_control", "arguments": {"action": "up"}}}
        if "volume down" in lower or "decrease volume" in lower or "lower volume" in lower:
            return {"tool_call": {"name": "volume_control", "arguments": {"action": "down"}}}
        if "mute" in lower:
            return {"tool_call": {"name": "volume_control", "arguments": {"action": "mute"}}}

        # Direct Spotify trigger
        if lower.strip() in ["spotify", "open spotify", "launch spotify", "play spotify", "start spotify"]:
            return {"tool_call": {"name": "open_application", "arguments": {"application": "Spotify"}}}

        # Media controls (play, pause, next)
        if lower.startswith("play ") or "pause" in lower or "resume music" in lower or "next song" in lower or "next track" in lower:
            if "pause" in lower:
                return {"tool_call": {"name": "media_control", "arguments": {"action": "pause"}}}
            if "next" in lower:
                return {"tool_call": {"name": "media_control", "arguments": {"action": "next"}}}
            if "previous" in lower or "prev" in lower:
                return {"tool_call": {"name": "media_control", "arguments": {"action": "previous"}}}
            # e.g. "play some music" or "play Spotify"
            if "spotify" in lower or "music" in lower:
                return {"tool_call": {"name": "open_application", "arguments": {"application": "Spotify"}}}

        # Applications: Open (supports "open", "launch", "start", "run", "open up", "could you open", etc.)
        open_match = re.search(r"(?:open|launch|start|run)\s+(?:up\s+)?(?:the\s+)?([a-zA-Z0-9_\-\s]+)", text, re.IGNORECASE)
        if open_match and not any(w in lower for w in ["file", "folder", "url", "site", "web"]):
            app_name = open_match.group(1).strip()
            # Clean trailing punctuation and polite filler words
            app_name = app_name.rstrip(".!?")
            app_name = re.sub(r"\s+(?:please|for me|now|app|application|program)$", "", app_name, flags=re.IGNORECASE).strip()
            app_name = re.sub(r"^(?:up\s+|the\s+|a\s+|an\s+)+", "", app_name, flags=re.IGNORECASE).strip()
            if app_name:
                return {
                    "tool_call": {
                        "name": "open_application",
                        "arguments": {"application": app_name}
                    }
                }

        # Applications: Close
        close_match = re.search(r"(?:close|exit|terminate|kill)\s+(?:the\s+)?([a-zA-Z0-9_\-\s]+)", text, re.IGNORECASE)
        if close_match and not any(w in lower for w in ["file", "folder", "lights"]):
            app_name = close_match.group(1).strip().rstrip(".!?")
            return {
                "tool_call": {
                    "name": "close_application",
                    "arguments": {"application": app_name}
                }
            }

        # List running apps
        if "what applications" in lower or "running applications" in lower or "running apps" in lower or "what's running" in lower:
            return {
                "tool_call": {
                    "name": "list_running_applications",
                    "arguments": {}
                }
            }

        # Web Search
        search_match = re.search(r"(?:search\s+(?:the\s+web\s+for|google\s+for|for)?|look\s+up|find)\s+(.+)", text, re.IGNORECASE)
        if search_match and ("search" in lower or "look up" in lower):
            query = search_match.group(1).strip().rstrip(".!?")
            return {
                "tool_call": {
                    "name": "search_web",
                    "arguments": {"query": query}
                }
            }

        # Folders & Files
        folder_create = re.search(r"create\s+(?:a\s+)?folder\s+(?:called\s+|named\s+)?([a-zA-Z0-9_\-\s\\/]+)", text, re.IGNORECASE)
        if folder_create:
            folder_name = folder_create.group(1).strip().rstrip(".!?")
            return {
                "tool_call": {
                    "name": "create_folder",
                    "arguments": {"path": folder_name}
                }
            }

        # Memory store: "Remember that ..."
        mem_match = re.search(r"remember\s+(?:that\s+)?(.+)", text, re.IGNORECASE)
        if mem_match:
            fact = mem_match.group(1).strip().rstrip(".!?")
            # Parse key-value if possible, e.g. "my project is StartUpSphere"
            parts = re.split(r"\s+is\s+", fact, maxsplit=1)
            if len(parts) == 2:
                key, val = parts[0].strip(), parts[1].strip()
            else:
                key, val = "user_note", fact
            return {
                "tool_call": {
                    "name": "store_memory",
                    "arguments": {"key": key, "value": val, "category": "user_preference"}
                }
            }

        # Memory query: "What do you remember..."
        if "what do you remember" in lower or "recall memory" in lower:
            return {
                "tool_call": {
                    "name": "retrieve_memory",
                    "arguments": {}
                }
            }

        # Reminders: "Remind me at 7 PM to submit assignment"
        reminder_match = re.search(r"remind\s+me\s+(?:at\s+([0-9:AMPamp\s]+)\s+)?to\s+(.+)", text, re.IGNORECASE)
        if reminder_match:
            time_part = reminder_match.group(1) or "1 hour"
            task_part = reminder_match.group(2).strip().rstrip(".!?")
            return {
                "tool_call": {
                    "name": "create_reminder",
                    "arguments": {"title": task_part, "time": time_part.strip()}
                }
            }

        # Smart home devices: Lights / Camera / Thermostat
        if "light" in lower or "lights" in lower:
            action = "off" if "off" in lower else "on"
            dev = "living room lights" if "living" in lower else "bedroom light"
            return {
                "tool_call": {
                    "name": "control_device",
                    "arguments": {"device_id": dev, "action": action}
                }
            }

        if "smart home" in lower or "devices" in lower or "lights status" in lower:
            return {
                "tool_call": {
                    "name": "list_devices",
                    "arguments": {}
                }
            }

        # Conversational greetings & courtesy
        if any(w in lower for w in ["thank you", "thanks", "appreciate it"]):
            return {"reply": "Always a pleasure, sir. Anything else?"}
        if any(w in lower for w in ["who are you", "what are you"]):
            return {"reply": "I am JARVIS, your personal artificial intelligence assistant, configured to manage your system, productivity, and environment."}
        if "how are you" in lower:
            return {"reply": "All systems are operational and performing at peak parameters, sir. How may I be of service?"}

        # Default conversational reply
        return {"reply": f"Understood, sir. Let me know if you would like me to perform an action regarding '{text}'."}

    def _synthesize_tool_speech(self, tool_name: str, args: dict, result: dict) -> str:
        """Generates natural, British AI-toned speech based on tool result."""
        res_data = result.get("result", {})
        
        if tool_name == "get_system_status":
            cpu = res_data.get("cpu", {}).get("percent", 0)
            mem = res_data.get("memory", {}).get("percent", 0)
            disk_free = res_data.get("disk", {}).get("free_gb", 0)
            battery = res_data.get("battery")
            bat_str = f", and battery is at {battery['percent']}%" if battery else ""
            return f"CPU usage is currently {cpu}%, memory is at {mem}%, with {disk_free} GB free on your primary disk{bat_str}, sir."

        if tool_name == "get_time_and_date":
            t = res_data.get("time", "")
            d = res_data.get("date", "")
            return f"It is currently {t} on {d}, sir."

        if tool_name == "open_application":
            app = args.get("application", "the application")
            if result.get("success"):
                return f"Opening {app} for you now, sir."
            return f"I wasn't able to locate or launch {app}, sir."

        if tool_name == "close_application":
            app = args.get("application", "")
            return f"Terminated {app}, sir."

        if tool_name == "take_screenshot":
            return "Screenshot captured and archived to your dashboard, sir."

        if tool_name == "lock_screen":
            return "Locking your workstation now, sir."

        if tool_name == "search_web":
            query = args.get("query", "")
            count = res_data.get("count", 0)
            first_summary = ""
            if res_data.get("results"):
                first_summary = res_data["results"][0].get("summary", "")
            if first_summary:
                return f"I've searched for {query}. Top result states: {first_summary[:160]}..."
            return f"I have queried the web for {query} and retrieved {count} results for your review."

        if tool_name == "create_folder":
            path = args.get("path", "")
            return f"Folder '{path}' has been successfully created, sir."

        if tool_name == "store_memory":
            key = args.get("key", "")
            val = args.get("value", "")
            return f"Noted, sir. I have committed to memory that {key} is {val}."

        if tool_name == "retrieve_memory":
            count = res_data.get("count", 0)
            return f"I have retrieved {count} saved memories from your profile."

        if tool_name == "create_reminder":
            title = args.get("title", "")
            t = args.get("time", "")
            return f"Certainly. I have scheduled a reminder for '{title}' at {t}."

        if tool_name == "control_device":
            dev = args.get("device_id", "device")
            act = args.get("action", "controlled")
            return f"{dev.capitalize()} has been switched {act}, sir."

        if tool_name == "list_devices":
            count = res_data.get("count", 0)
            return f"Your smart environment currently reports {count} active devices."

        return f"Action {tool_name} completed successfully, sir."

    def _get_api_base(self) -> str:
        if settings.AI_BASE_URL:
            return settings.AI_BASE_URL.rstrip("/")
        if "gemini" in settings.AI_MODEL.lower() or settings.LLM_PROVIDER == "gemini":
            return "https://generativelanguage.googleapis.com/v1beta/openai"
        if "groq" in settings.LLM_PROVIDER or "llama-3.3" in settings.AI_MODEL.lower() or "qwen" in settings.AI_MODEL.lower():
            return "https://api.groq.com/openai/v1"
        if settings.LLM_PROVIDER == "ollama":
            return "http://localhost:11434/v1"
        return "https://api.openai.com/v1"

    async def _synthesize_with_llm(
        self,
        user_prompt: str,
        tool_name: str,
        tool_args: dict,
        exec_result: dict,
        tool_call_id: Optional[str] = None
    ) -> Optional[str]:
        """Calls the LLM with tool output to formulate a natural, complete response for the user."""
        res_payload = exec_result.get("result", exec_result)

        if isinstance(res_payload, dict) and "results" in res_payload:
            compact = []
            for item in res_payload.get("results", [])[:5]:
                t = item.get("title", "")
                s = item.get("summary", "")
                compact.append(f"- {t}: {s}")
            content_str = "\n".join(compact) or json.dumps(res_payload)[:2000]
        else:
            content_str = json.dumps(res_payload)[:2500]

        messages = [
            {
                "role": "system",
                "content": (
                    "You are J.A.R.V.I.S., Tony Stark's sophisticated personal AI assistant. "
                    "You have just executed a system or web tool on behalf of the user. "
                    "Synthesize the provided tool data and answer the user's inquiry directly, clearly, "
                    "and concisely in conversational British English prose. Address the user politely as 'sir'. "
                    "Keep your response short, punchy, and conversational: 1 to 2 concise sentences (at most 3 short sentences). "
                    "Do NOT recite long essays, disclaimers, or pre-announcements like 'Searching for...'. "
                    "Do NOT call any further tools, and do NOT output any XML, JSON, or code tags."
                )
            },
            {"role": "user", "content": user_prompt},
            {
                "role": "user",
                "content": f"[Tool '{tool_name}' executed with arguments {json.dumps(tool_args)}]\nTool Results:\n{content_str}\n\nDeliver the final concise verbal answer directly to the user."
            }
        ]

        headers = {"Content-Type": "application/json"}
        if settings.AI_API_KEY:
            headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"

        payload = {
            "model": settings.AI_MODEL,
            "messages": messages,
            "temperature": 0.25,
            "max_tokens": 180
        }

        api_base = self._get_api_base()
        timeout_secs = 20.0 if settings.LLM_PROVIDER == "ollama" else 10.0
        client = self._get_http_client(timeout_secs)

        resp = await client.post(f"{api_base}/chat/completions", headers=headers, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["choices"][0]["message"].get("content", "")
            # Clean any stray tool tags if generated
            cleaned_text = re.sub(r"<tool_call>.*?</tool_call>", "", raw_text, flags=re.DOTALL)
            cleaned_text = re.sub(r"<function=.*?</function>", "", cleaned_text, flags=re.DOTALL)
            cleaned_text = re.sub(r"<[^>]+>", "", cleaned_text).strip()
            # Strip pre-search announcements like "Searching for..."
            cleaned_text = re.sub(r'^(?:(?:To provide you with|In order to provide|I will perform|Searching for|Looking up)[^.]*?\.\.\.?\s*)+', '', cleaned_text, flags=re.IGNORECASE).strip()
            return cleaned_text or raw_text
        return None

    async def _call_cloud_llm(self, prompt: str) -> Optional[dict]:
        """Calls Gemini, OpenAI, Groq, or Ollama-compatible endpoint with tool definitions and fallbacks."""
        headers = {
            "Content-Type": "application/json"
        }
        if settings.AI_API_KEY:
            headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"

        # Ensure the prompt is in the conversation history as the latest user message
        messages = [
            {"role": "system", "content": JARVIS_SYSTEM_PROMPT},
            *self.conversation_history[-6:]
        ]
        if not messages or messages[-1].get("role") != "user":
            messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": settings.AI_MODEL,
            "messages": messages,
            "temperature": 0.25,
            "max_tokens": 280,
            "tools": tool_registry.get_all_schemas()
        }

        api_base = self._get_api_base()
        timeout_secs = 30.0 if settings.LLM_PROVIDER == "ollama" else 12.0
        client = self._get_http_client(timeout_secs)

        try:
            resp = await client.post(f"{api_base}/chat/completions", headers=headers, json=payload)
            
            # If model doesn't support tools schema (e.g. older llama3 in Ollama), retry without tools payload
            if resp.status_code == 400 and ("support tools" in resp.text.lower() or "tools" in resp.text.lower()):
                payload_no_tools = {k: v for k, v in payload.items() if k != "tools"}
                resp = await client.post(f"{api_base}/chat/completions", headers=headers, json=payload_no_tools)

            if resp.status_code == 200:
                data = resp.json()
                choice = data["choices"][0]["message"]
                
                # 1. Native OpenAI-style tool calls
                if "tool_calls" in choice and choice["tool_calls"]:
                    tc = choice["tool_calls"][0]
                    tc_fn = tc["function"]
                    args = tc_fn.get("arguments", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except Exception:
                            args = {}
                    return {
                        "tool_call": {
                            "name": tc_fn["name"],
                            "arguments": args
                        },
                        "tool_call_id": tc.get("id", "call_1")
                    }
                
                content = choice.get("content", "")
                
                # 2. Check if model returned tool invocation JSON in plain text
                json_match = re.search(r'```(?:json)?\s*(\{\s*"(?:name|tool)":\s*"[^"]+",\s*"arguments":\s*\{.*?\}\s*\})\s*```', content, re.DOTALL)
                if not json_match:
                    json_match = re.search(r'(\{\s*"(?:name|tool)":\s*"[^"]+",\s*"arguments":\s*\{.*?\}\s*\})', content, re.DOTALL)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group(1))
                        tool_name = parsed.get("name") or parsed.get("tool")
                        tool_args = parsed.get("arguments", {})
                        
                        # Handle shell-style hallucinations by translating to open_application
                        if tool_name in ["run_command", "bash", "shell", "exec"]:
                            cmd = tool_args.get("command", "") or tool_args.get("cmd", "")
                            app_match = re.search(r'(?:open|start|launch)\s+(?:-a\s+)?["\']?([^"\'\n]+)["\']?', cmd, re.I)
                            if app_match:
                                tool_name = "open_application"
                                tool_args = {"application": app_match.group(1).strip()}
                        
                        if tool_name:
                            return {
                                "tool_call": {
                                    "name": tool_name,
                                    "arguments": tool_args
                                },
                                "tool_call_id": "call_text_json"
                            }
                    except Exception:
                        pass

                # 3. Check if model replied with text saying it will search or look up without a structured tool_call
                search_text_match = re.search(
                    r'(?:perform a (?:quick )?web search|searching for|let me (?:search|look up)|looking up|querying the web for)\s+["\']?([^"\'.\n]+)',
                    content,
                    re.IGNORECASE
                )
                if search_text_match:
                    search_q = search_text_match.group(1).strip()
                    search_q = re.sub(r'\s+(?:as|because|since)\s+.*$', '', search_q, flags=re.IGNORECASE)
                    if search_q:
                        return {
                            "tool_call": {
                                "name": "search_web",
                                "arguments": {"query": search_q}
                            },
                            "tool_call_id": "call_search_text"
                        }

                return {"reply": content}
            else:
                print(f"[JARVIS BRAIN] LLM returned status {resp.status_code}: {resp.text[:250]}")
        except Exception as e:
            print(f"[JARVIS BRAIN] LLM request error: {e}")
        return None

jarvis_brain = JarvisBrain()
