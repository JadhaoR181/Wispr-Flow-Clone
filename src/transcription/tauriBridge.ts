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

export async function initDeepgramTauri(apiKey: string) {
  if (!isTauri()) return;
  await invoke("init_deepgram", { apiKey });
}

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

    await invoke("start_listening");
    console.log(" Deepgram listening started");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(" Deepgram connection error:", msg);
    onError?.(msg);
    throw error;
  }
}

export async function stopDeepgram() {
  if (!isTauri()) return;

  try {
    await invoke("stop_listening");
    console.log(" Deepgram connection closed");
  } catch (error) {
    console.error(" Error stopping Deepgram:", error);
  } finally {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }
}
