// src/transcription/tauriBridge.ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type DeepgramPayload = {
  text: string;
  final: boolean;
};

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

let unsubscribe: (() => void) | null = null;

export async function startDeepgram(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
) {
  if (!isTauri()) {
    const msg = "Not running in Tauri environment";
    console.warn(msg);
    onError?.(msg);
    return;
  }

  try {
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("Deepgram API key not found");

    // subscribe once per start
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    const unlisten = await listen<DeepgramPayload>(
      "deepgram-transcript",
      (event) => {
        console.log("EVENT FROM RUST:", event.payload);
        onTranscript(event.payload.text, event.payload.final);
      }
    );
    unsubscribe = () => unlisten();

    await invoke("start_listening", { apiKey });
    console.log("✅ Deepgram connection established");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Deepgram connection error:", msg);
    if (msg.includes("429")) {
      onError?.(
        "Deepgram rate limit hit (429). Please wait a few seconds and try again."
      );
    } else {
      onError?.(msg);
    }
    throw error;
  }
}

export async function stopDeepgram() {
  if (!isTauri()) return;

  try {
    await invoke("stop_listening");
    console.log("✅ Deepgram connection closed");
  } catch (error) {
    console.error("❌ Error stopping Deepgram:", error);
  } finally {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }
}
