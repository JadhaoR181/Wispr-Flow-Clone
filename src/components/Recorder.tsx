// src/components/Recorder.tsx
import { useMicrophone } from "../audio/useMicrophone";
import "../App.css";

function Recorder() {
  const {
    listening,
    connecting,
    error,
    finalText,
    partialText,
    start,
    stop,
    setFinalText,
    setPartialText,
  } = useMicrophone();

  const clearText = () => {
    setFinalText("");
    setPartialText("");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        finalText + (partialText ? " " + partialText : "")
      );
      alert("Text copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const statusClass = listening
    ? "recording"
    : connecting
    ? "connecting"
    : "idle";

  const statusLabel = listening
    ? "🔴 Recording"
    : connecting
    ? "🟡 Connecting…"
    : "⚪ Idle";

  const buttonLabel = listening
    ? "🔴 Release to Stop"
    : connecting
    ? "🟡 Connecting…"
    : "🎤 Hold to Record";

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Wispr Flow Clone</h1>
        <div className="status-indicators">
          <span className={`status-badge ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <main className="main-content">
        <div className="transcript-container">
          <div className="transcript-header">
            <h2>Transcription</h2>
            <div className="button-group">
              <button
                onClick={copyToClipboard}
                disabled={!finalText && !partialText}
              >
                📋 Copy
              </button>
              <button
                onClick={clearText}
                disabled={!finalText && !partialText}
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          <textarea
            className="transcript-output"
            readOnly
            value={finalText + (partialText ? " " + partialText : "")}
            placeholder="Press and hold Space or the Record button to start speaking..."
          />

          {partialText && (
            <div className="partial-indicator">
              <span className="blinking-dot">●</span> Processing...
            </div>
          )}
        </div>

        <div className="controls">
          <button
            className={`record-button ${listening ? "recording" : ""}`}
            disabled={connecting}
            onMouseDown={start}
            onMouseUp={stop}
            onMouseLeave={() => listening && stop()}
          >
            {buttonLabel}
          </button>

          <p className="hint">
            💡 Tip: Press and hold <kbd>Space</kbd> for push-to-talk
          </p>
        </div>
      </main>
    </div>
  );
}

export default Recorder;
