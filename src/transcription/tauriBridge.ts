import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type DeepgramPayload = {
  text: string;
  final: boolean;
};

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export async function startDeepgram(
  onTranscript: (text: string, isFinal: boolean) => void
) {
  if (!isTauri()) {
    console.warn("Not running inside Tauri — Deepgram disabled");
    return;
  }

  await invoke("start_deepgram", {
    apiKey: import.meta.env.VITE_DEEPGRAM_API_KEY,
  });

  await new Promise((r) => setTimeout(r, 300));

  await listen<DeepgramPayload>("deepgram-transcript", (event) => {
    onTranscript(event.payload.text, event.payload.final)
  });
}

export async function sendAudioChunk(chunk: Float32Array) {
  if (!isTauri()) return;

  const pcm16 = Array.from(chunk, (v) =>
    Math.max(-1, Math.min(1, v)) * 0x7fff
  ).map(Math.round);

  invoke("send_audio_chunk", { chunk: pcm16 });
}

export async function stopDeepgram() {
  if (!isTauri()) return;
  await invoke("stop_deepgram");
}
