let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let processor: ScriptProcessorNode | null = null;  // ScripProcessorNode is Deprecated and says use AUdioWorkletNode

const SAMPLE_RATE = 16000;

export async function startMicrophone(
    onAudioChunk: (chunk: Float32Array) => void
){
    if(audioContext) return;

    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
    });

    audioContext = new AudioContext({sampleRate: SAMPLE_RATE});
    const source = audioContext.createMediaStreamSource(mediaStream);

    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) =>{
        const input = event.inputBuffer.getChannelData(0);
        onAudioChunk(new Float32Array(input));
    };
    source.connect(processor);
    processor.connect(audioContext.destination);
}

export async function stopMicrophone() {
    processor?.disconnect();
    processor = null;

    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;

    await audioContext?.close();
    audioContext = null;
    
}