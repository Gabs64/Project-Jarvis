# JARVIS AI — Autonomous Voice-Controlled Desktop OS Interface

> **Version:** 1.0.0  
> **Platform:** Windows Desktop (Local-First)  
> **Backend:** Python FastAPI + WebSockets + SQLAlchemy (Async SQLite) + psutil + DuckDuckGo Search  
> **Frontend:** React + Vite + TypeScript + Lucide Icons + Web Speech Recognition & Speech Synthesis  
> **Architecture:** Restricted Tool Execution Layer with Risk Management & Security Intercepts

---

## ✦ System Overview

**JARVIS** (*Just A Rather Very Intelligent System*) is a personal AI assistant built as a futuristic command center operating system interface. It allows natural hands-free voice and text control over your computer, file system, web search, smart home devices, and daily productivity routines with a sophisticated British AI personality.

---

## ✦ Architecture & Security Model

```
                    OPERATOR (Voice / Text)
                              │
                              ▼
                ┌───────────────────────────┐
                │   React + Vite Desktop    │
                │   Central Reactor Orb     │
                │   Web Speech I/O Engine   │
                └─────────────┬─────────────┘
                              │ WebSockets / REST
                              ▼
                ┌───────────────────────────┐
                │    FastAPI Neural Core    │
                │  Dual LLM / Semantic AI   │
                └─────────────┬─────────────┘
                              │
                              ▼
                ┌───────────────────────────┐
                │  Permission & Risk Engine │
                │  LOW / MEDIUM / HIGH / CRIT
                └─────────────┬─────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
         Computer Tools   Web Tools    Smart Home Hub
         • Applications   • DDG Search • Lights
         • System Metrics • Browser    • Thermostat
         • Screenshot     • URL Opener • Cameras
         • File Sandbox   • Fetching   • Switches
```

### Safety Principles
- **No Direct Shell Access:** The AI never executes raw, arbitrary shell scripts directly.
- **Risk Tiers:** Every tool is categorized by risk (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Confirmation Intercept:** Destructive actions (system shutdown, restart, permanent file deletion) trigger an interactive security authorization modal with vocal or click confirmation.

---

## ✦ Key Features

1. **Central Holographic Reactor Orb (`JarvisOrb`)**
   - 6 Animated States: `IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `EXECUTING`, `ERROR`.
   - Audio-reactive frequency spectrum bars and orbital gyro rings.

2. **Cinematic JARVIS Voice Engines**
   - **Local Neural TTS (Option 2 - Recommended):** Free, open-source British neural speech synthesis powered by local backend streaming (`en-GB-RyanNeural` - Paul Bettany JARVIS tone) with zero API keys and zero cost.
   - **Web Speech API (Option 1 - Serverless):** Zero latency, runs 100% locally in the browser with tuned British cadence (`pitch: 0.95`, `rate: 1.05`, and prioritized UK male voices).
   - **Fish Audio S2.1 Pro:** Cloud neural voice clone model (`s2.1-pro-free`) with reference voice ID support.
   - Built on Web Speech Recognition with persistent, continuous listening and wake-word detection (*"Jarvis"*).
   - Sentence-level voice interruption (*"Stop"*, *"Cancel"*, *"Wait"*, *"Never mind"* halts speech immediately).
   - Integrated cybernetic audio chimes via Web Audio API.

3. **Computer & Application Automation**
   - Launch, focus, and close desktop applications (Chrome, Spotify, VS Code, Discord, Terminal, Calculator, etc.).
   - Live system telemetry monitoring: CPU load, RAM usage, storage availability, battery, and local time.
   - Desktop display screenshot capture with instant UI preview.
   - Workstation session lock and media key control (Play, Pause, Next, Previous, Volume).

4. **Safe File System Sandbox**
   - Directory listing, text file preview, folder creation, and search.
   - Automatic protection for critical Windows system paths.

5. **Daily Executive Briefing**
   - Interactive morning briefing aggregating current time, weather conditions, scheduled reminders, active tasks, and hardware health.

6. **Smart Home IoT Hub**
   - Out-of-the-box local device simulator and Home Assistant REST integration.
   - Interactive controls for living room lights, ceiling fixtures, Nest thermostat, and surveillance camera.

7. **Long-Term Memory & Productivity**
   - Memory store for user preferences, contacts, and project paths (*"Remember that my main project is StartUpSphere"*).
   - Scheduled reminders and priority task matrices.

8. **Audit & Tool Execution Logs**
   - Real-time logging of tool calls, execution latencies, risk levels, and status results into SQLite.

---

## ✦ Getting Started

### 1. One-Click Automated Launch (Recommended)
Simply double-click:
- **`start_jarvis.bat`**

This single file automatically:
1. Detects Python (`.venv` or system) and Node.js / npm.
2. Checks and launches Ollama in the background (if installed & needed).
3. Spawns the **FastAPI Neural Core** backend on `http://127.0.0.1:8000`.
4. Spawns the **React Vite UI** frontend on `http://localhost:5173`.
5. Automatically opens `http://localhost:5173` in your default browser.
6. Safely tears down all services when you press any key in the console window.

---

### 2. Manual Startup

#### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.11+ (managed via `uv` or system Python)

#### Running the Backend
From the root workspace directory:
```powershell
# Activate Python virtual environment and start FastAPI:
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend URL: `http://127.0.0.1:8000`
* WebSocket: `ws://127.0.0.1:8000/ws/jarvis`
* Interactive API Docs: `http://127.0.0.1:8000/docs`

#### Running the Frontend
In a new terminal:
```powershell
cd frontend
npm run dev
```
* Frontend URL: `http://localhost:5173`

---

## ✦ Voice & Natural Language Commands

| Command | Action |
| :--- | :--- |
| *"Jarvis"* | Wakes assistant: *"Yes, sir? How may I assist you?"* |
| *"What is my CPU usage?"* | Returns live CPU, RAM, and Disk metrics |
| *"Open Chrome"* / *"Open Spotify"* | Launches the application |
| *"Take a screenshot"* | Captures screen and displays preview in log |
| *"Search the web for [query]"* | Performs web search and summarizes top result |
| *"Give me my morning briefing"* | Opens full daily executive briefing card |
| *"Remember that my project is StartUpSphere"* | Records persistent memory fact |
| *"Turn on the living room lights"* | Toggles smart light status |
| *"Remind me at 8 PM to study"* | Schedules a local reminder |
| *"Lock my PC"* | Locks Windows desktop session |
| *"Shut down my computer"* | Triggers security confirmation dialog |
| *"Stop"* / *"Cancel"* | Immediately interrupts speech synthesis |

---

## ✦ Project Directory Layout

```
Project Jarvis/
├── backend/
│   ├── app/
│   │   ├── ai/            # Neural reasoning & prompt engine
│   │   ├── api/           # REST endpoints & WebSocket handler
│   │   ├── automation/    # Autonomous routine scheduler
│   │   ├── database/      # SQLAlchemy async session & models
│   │   ├── memory/        # Long-term memory repository
│   │   ├── security/      # Risk matrix & confirmation checks
│   │   ├── services/      # Briefing & telemetry services
│   │   ├── tools/         # System, App, File, Web, IoT, Reminders
│   │   └── config.py      # App configuration & settings
│   └── main.py            # FastAPI server entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/    # JarvisOrb, SystemStatus, QuickActions, etc.
│   │   ├── hooks/         # useVoiceEngine Web Speech Hook
│   │   ├── styles/        # HUD tokens & visual design system
│   │   ├── App.tsx        # Main application layout
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── data/                  # SQLite database, screenshots, logs
└── README.md
```
