// src/audio/useMicrophone.tsx
import { useCallback, useEffect, useState } from "react";
import { startDeepgram, stopDeepgram } from "../transcription/tauriBridge";

export function useMicrophone() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalText, setFinalText] = useState("");
  const [partialText, setPartialText] = useState("");

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    console.log("HANDLE TRANSCRIPT:", { text, isFinal });
    if (isFinal) {
      setFinalText((prev) => (prev ? `${prev} ${text}` : text));
      setPartialText("");
    } else {
      setPartialText(text);
    }
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (listening) return;
    setListening(true);
    try {
      setError(null);
      setPartialText("");
      await startDeepgram(handleTranscript, handleError);
      console.log("✅ Recording started");
    } catch {
      setListening(false);
    }
  }, [listening, handleTranscript, handleError]);

  const stop = useCallback(async () => {
    if (!listening) return;
    try {
      await stopDeepgram();
    } finally {
      setListening(false);
      console.log("✅ Recording stopped");
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
