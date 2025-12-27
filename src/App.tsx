import { useState } from "react";
import { startMicrophone, stopMicrophone } from "./audio/microphone";
import {
  startDeepgram,
  sendAudioChunk,
  stopDeepgram,
} from "./transcription/tauriBridge";
import { useRef } from "react";

function App() {
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [partial, setPartial] = useState("");
  const lastFinalRef = useRef("");

  const toggle = async () => {
    if (!recording) {
      // reset text
      setFinalText("");
      setPartial("");

     await startDeepgram((text, isFinal) => {
  if (isFinal) {
    // prevent duplicates
    if (text !== lastFinalRef.current) {
      setFinalText((prev) => prev + text + " ");
      lastFinalRef.current = text;
    }
    setPartial("");
  } else {
    setPartial(text);
  }
});

      await startMicrophone(sendAudioChunk);
      setRecording(true);
    } else {
      await stopMicrophone();
      await stopDeepgram();
      setRecording(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <button onClick={toggle}>
        {recording ? "Stop" : "Start"}
      </button>

      <p style={{ marginTop: 20, fontSize: 18 }}>
        {finalText}
        <span style={{ opacity: 0.5 }}>{partial}</span>
      </p>
    </div>
  );
}

export default App;
