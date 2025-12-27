let socket: WebSocket | null = null;
let isSocketReady = false;

const DEEPGRAM_URL =
  "wss://api.deepgram.com/v1/listen" +
  "?model=nova-2" +
  "&language=en-US" +
  "&punctuate=true" +
  "&interim_results=true" +
  "&encoding=linear16" +
  "&sample_rate=16000" +
  "&channels=1";

export function startDeepgram(
  onTranscript: (text: string, isFinal: boolean) => void
) {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;

  const wsUrl = `${DEEPGRAM_URL}&access_token=${apiKey}`;

  socket = new WebSocket(wsUrl);
  isSocketReady = false;

  socket.onopen = () => {
    console.log("✅ Deepgram connected");
    isSocketReady = true;
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    const transcript =
      data.channel?.alternatives?.[0]?.transcript;

    if (transcript) {
      onTranscript(transcript, data.is_final);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ Deepgram WebSocket error", err);
  };

  socket.onclose = () => {
    console.log("🔌 Deepgram connection closed");
    isSocketReady = false;
  };
}

export function sendAudioToDeepgram(chunk: Float32Array) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !isSocketReady) {
    return;
  }

  const pcm16 = new Int16Array(chunk.length);
  for (let i = 0; i < chunk.length; i++) {
    pcm16[i] = Math.max(-1, Math.min(1, chunk[i])) * 0x7fff;
  }

  socket.send(pcm16.buffer);
}

export function stopDeepgram() {
  if (!socket) return;

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "CloseStream" }));
  }

  socket.close();
  socket = null;
  isSocketReady = false;
}
