# Wispr Flow Clone 🎙️ – Tauri + Deepgram Voice-to-Text Desktop App

A cross‑platform desktop **voice‑to‑text** application inspired by Wispr Flow, built with Tauri (Rust) and React.  
It focuses on a smooth push‑to‑talk workflow and real‑time transcription using Deepgram’s Streaming API.

---

## ✨ Overview

This project is a functional clone of the core Wispr Flow workflow: press and hold to speak, stream microphone audio to Deepgram, and see live transcription appear on screen.

The goal is to demonstrate:

- Reliable microphone capture in a desktop environment (Tauri + CPAL).
- Real‑time streaming to Deepgram over WebSockets.
- A clean, focused UI built with React + Vite that mimics Wispr Flow’s voice‑typing experience.

---

## 🎥 Demo & Screenshots

- **Demo video **: `YouTube / Google Drive link`
- **Screenshots**:
  - Main voice‑to‑text window showing push‑to‑talk and transcription.
  - Error state (e.g., no API key / no microphone).

---

## 🔑 Core Features

- ✅ **Push‑to‑Talk Voice Input**  
  Press and hold **Space** (or click the Record button) to start capturing microphone audio; release to stop.

- ✅ **Microphone Access & Audio Capture**  
  Uses **CPAL** in the Tauri/Rust backend to open the default input device, stream PCM frames, and handle permission errors gracefully. 

- ✅ **Real‑Time Transcription with Deepgram**  
  Streams 16‑bit linear PCM audio over a WebSocket to Deepgram’s `/v1/listen` endpoint and listens for interim and final transcripts.

- ✅ **Display & Insert Text**  
  Shows interim and final transcription in the UI, with controls to copy and clear the text for use in other apps.
  
- ✅ **Recording Controls & Visual Feedback**  
  Clear connecting / idle / recording states, button animations, and disabled UI while connecting or when errors occur. 

- ✅ **Error Handling**  
  Handles typical failures:
  - Missing / invalid `DEEPGRAM_API_KEY`
  - Network / WebSocket errors
  - No microphone device available  
  Errors are logged in the Rust backend and surfaced to the UI state / toasts. 

---

## 🛠️ Tech Stack

### Frontend

- **React + TypeScript** – UI and state management (Vite tooling).
- **Vite** – Fast dev server + bundler.

### Backend & Desktop Shell

- **Tauri 2 (Rust)** – Cross‑platform desktop runtime and bridge between React and native code.
- **Rust + Tokio** – Async runtime for audio + WebSocket streaming.
- **CPAL** – Cross‑platform audio input (microphone capture).

### External Services

- **Deepgram Streaming API** – Low‑latency speech‑to‑text for real‑time transcription.

---

## 📁 Project Structure

```
wispr-flow-clone/
│
├── node_modules/                
├── public/                          
├── src/                             # React frontend source
│   ├── assets/                     
│   ├── audio/                    
│   │   └── useMicrophone.tsx        # Hook for mic capture & state handling
│   ├── components/                  
│   │   └── Recorder.tsx             # Main push-to-talk / recording UI
│   ├── transcription/              
│   │   └── tauriBridge.ts            # Wrapper for Tauri `invoke` API
│   ├── App.tsx                      
│   ├── App.css
│   ├── index.css                    
│   └── main.tsx                     
│
├── src-tauri/                       # Tauri (Rust) backend
│   ├── capabilities/
│   ├── gen/
│   ├── icons/
│   ├── src/
│   │   ├── lib.rs
│   │   └── main.rs                  # Tauri entry point (audio + Deepgram logic)
│   ├── target/                      
│   ├── build.rs                    
│   ├── Cargo.toml                   # Rust dependencies & Tauri config
│   └── tauri.conf.json              # Tauri window & app configuration
│
├── .env                             # Deepgram API key
├── .gitignore                     
├── index.html                      
├── package.json                    
├── package-lock.json               
├── eslint.config.js              
├── vite.config.ts                
└── README.md                       

```

---

## 🔧 Installation & Setup

### Prerequisites

- **Node.js** ≥ 18.x  
- **Rust** (stable, e.g., ≥ 1.77) with `cargo` installed.  
- **Tauri CLI** (optional but recommended):
```bash
npm install -g @tauri-apps/cli
```


- A **Deepgram API key** – create one in the Deepgram dashboard.

### Clone and install
```
git clone https://github.com/JadhaoR181/Wispr-Flow-Clone.git
cd Wispr-Flow-Clone

Install frontend + Tauri JS dependencies
npm install
```

### Configure environment

Create a `.env` file (or `src-tauri/.env`, depending on your setup) and add:
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```
Make sure `.env` is listed in `.gitignore` so the key is never committed.

---

## 🚀 Running the App

### Development mode

Runs React dev server + Tauri in debug mode:
```
npm run tauri dev
```
This will:

1. Start the Vite dev server for the React UI.
2. Launch the Tauri shell, which loads the dev URL.
3. Connect microphone + Deepgram when you interact with the UI.

### Production build

Build a release desktop binary:
```
npm run tauri build
```

- Frontend is built with Vite.
- Tauri bundles the Rust backend + frontend into a native app.
- Binaries will be located under `src-tauri/target/release/`. 

---

## 🧱 Architecture & Flow

1. **User interaction (React)**  
   - User presses the Record button or holds **Space**.  
   - `Recorder.tsx` and `useMicrophone.tsx` update UI state and call Tauri commands via `tauriBridge.ts`.

2. **Audio capture (Rust / CPAL)**  
   - Tauri commands (`init_deepgram`, `start_listening`, `stop_listening`) control a shared `AppState` that tracks the WebSocket and a `running` flag.
   - A CPAL input stream continuously captures microphone audio and sends PCM frames into a Tokio channel. 

3. **Streaming to Deepgram**  
   - When `running == true`, a Tokio task reads audio frames from the channel and forwards them to Deepgram over WebSocket.
   - Deepgram returns interim and final transcripts as JSON messages.

4. **Back to UI**  
   - Rust emits a `deepgram-transcript` event with `{ text, final }`. 
   - The React side listens for this event, updates the displayed transcription, and handles finalization / copy / clear actions.

---

## 🧪 To Test the Core Workflow

1. Start the app with a valid `DEEPGRAM_API_KEY`.  
2. Wait for the UI to show “Connecting…” then “Ready”.
3. Hold **Space** and speak a sentence; release to stop.  
4. Confirm:
   - Live transcript appears as you speak.
   - Final text stabilizes a short moment after you stop.
5. Test error cases:
   - Run without a key and observe error handling.
   - Disable microphone permission and restart. 

---

## 🤝 Contributing

While this project was originally built as a technical assignment, contributions are welcome:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to your fork and open a Pull Request.

Please follow existing code style and keep Rust/React layers clearly separated.

---

## 📝 License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

## 👤 Author

**Ravindra Jadhav**  
*Software Developer*

- 🐙 **GitHub:** https://github.com/JadhaoR181  
- 📧 **Email:** `jadhaor181@gmail.com`

---

> 📝 This README was generated with the assistance of **Reado AI – AI-Powered README Generator**, a personal project developed by the author.  
> 🌐 **Live:** https://reado-ai.vercel.app/
