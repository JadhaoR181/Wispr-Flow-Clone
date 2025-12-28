// src/transcription/deepgramClient.ts
// Pure frontend Deepgram WebSocket client.

export type DeepgramTranscriptHandler = (
  text: string,
  isFinal: boolean
) => void;

export class DeepgramClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private sampleRate: number;
  private onTranscript: DeepgramTranscriptHandler;

  constructor(
    apiKey: string,
    onTranscript: DeepgramTranscriptHandler,
    sampleRate = 16000
  ) {
    this.apiKey = apiKey;
    this.sampleRate = sampleRate;
    this.onTranscript = onTranscript;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // For browser WebSocket, send the key as a query param
      const url = `wss://api.deepgram.com/v1/listen`
        + `?model=nova-2`
        + `&language=en-US`
        + `&punctuate=true`
        + `&interim_results=true`
        + `&encoding=linear16`
        + `&sample_rate=${this.sampleRate}`
        + `&token=${encodeURIComponent(this.apiKey)}`;

      const ws = new WebSocket(url); // only 1 argument allowed in browser

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log(" Deepgram WebSocket connected (frontend)");
        this.ws = ws;
        resolve();
      };

      ws.onerror = () => {
        console.error(" Deepgram WebSocket error");
        reject(new Error("Deepgram WebSocket error"));
      };

      ws.onclose = (event) => {
        console.log("🔌 Deepgram WebSocket closed", event.code, event.reason);
        this.ws = null;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type !== "Results") return;

          const channel = data.channel;
          const alt = channel?.alternatives?.[0];
          const transcript: string = alt?.transcript ?? "";
          const isFinal: boolean = data.is_final ?? false;

          if (!transcript) return;
          console.log("DEEPGRAM FRONTEND TRANSCRIPT:", { transcript, isFinal });
          this.onTranscript(transcript, isFinal);
        } catch (err) {
          console.error("Failed to parse Deepgram message", err);
        }
      };
    });
  }

  sendAudio(rawPcm16: Int16Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(rawPcm16.buffer);
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, "Client closing");
    }
    this.ws = null;
  }
}
