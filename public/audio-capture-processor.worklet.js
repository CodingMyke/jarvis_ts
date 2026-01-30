/**
 * AudioWorklet processor per la cattura del microfono.
 * Invia campioni Float32 al main thread via postMessage.
 * Sostituisce il deprecato ScriptProcessorNode.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (input?.length > 0) {
      const channelData = input[0];
      if (channelData?.length > 0) {
        this.port.postMessage({ samples: new Float32Array(channelData) });
      }
    }
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
