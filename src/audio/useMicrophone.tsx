import { useCallback, useEffect, useState } from "react";
import {
  initDeepgramTauri,
  startDeepgram,
  stopDeepgram,
} from "../transcription/tauriBridge";

export function useMicrophone() {
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");

  // Init Deepgram once when app loads
  useEffect(() => {
    (async () => {
      try {
        setConnecting(true);
        const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
        if (!apiKey) throw new Error("Deepgram API key not found");
        await initDeepgramTauri(apiKey);
        console.log(" Deepgram initialized on app start");
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to init Deepgram";
        setError(msg);
      } finally {
        setConnecting(false);
      }
    })();
  }, []);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      console.log("HANDLE TRANSCRIPT:", { text, isFinal });
      if (!text.trim()) return;
      if (isFinal) {
        setFinalText((prev) => (prev ? `${prev} ${text}` : text));
        setPartialText("");
      } else {
        setPartialText(text);
      }
    },
    []
  );

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setListening(false);
    setConnecting(false);
  }, []);

  const start = useCallback(async () => {
    if (listening || connecting) return;
    setListening(true);
    try {
      setError(null);
      setPartialText("");
      await startDeepgram(handleTranscript, handleError);
      console.log(" Recording started");
    } catch {
      setListening(false);
    }
  }, [listening, connecting, handleTranscript, handleError]);

  const stop = useCallback(async () => {
    if (!listening) return;
    try {
      await stopDeepgram();
    } finally {
      setListening(false);
      console.log(" Recording stopped");
    }
  }, [listening]);

  // Spacebar push-to-talk
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (e.repeat) return;
      if ((e.target as HTMLElement).tagName !== "BODY") return;
      e.preventDefault();
      start();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      stop();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listening) {
        stopDeepgram();
      }
    };
  }, [listening]);

  return {
    listening,
    connecting,
    error,
    finalText,
    partialText,
    start,
    stop,
    setFinalText,
    setPartialText,
    setError,
  };
}
