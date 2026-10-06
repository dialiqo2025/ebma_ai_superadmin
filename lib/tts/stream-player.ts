/**
 * Play a raw PCM s16le stream (GPU TTS `stream: true`) via Web Audio API.
 * Schedules buffers with a small lead-in so playback starts before the stream ends.
 */
export async function playPcmStream(
  response: Response,
  options?: {
    signal?: AbortSignal;
    onStart?: () => void;
    onEnded?: () => void;
  },
): Promise<void> {
  if (!response.body) throw new Error("No audio stream body");

  const sampleRate = Number(
    response.headers.get("x-audio-sample-rate") ||
      response.headers.get("X-Audio-Sample-Rate") ||
      24_000,
  );
  const channels = Number(
    response.headers.get("x-audio-channels") ||
      response.headers.get("X-Audio-Channels") ||
      1,
  );

  const audioContext = new AudioContext({ sampleRate });
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const reader = response.body.getReader();
  let leftover = new Uint8Array(0);
  let nextTime = audioContext.currentTime + 0.05;
  let started = false;
  let aborted = false;

  const onAbort = () => {
    aborted = true;
    void reader.cancel().catch(() => undefined);
  };
  options?.signal?.addEventListener("abort", onAbort, { once: true });

  const schedulePcm = (pcmBytes: Uint8Array) => {
    if (pcmBytes.byteLength < 2) return;
    const aligned = pcmBytes.byteLength - (pcmBytes.byteLength % (2 * channels));
    if (aligned <= 0) return;

    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, aligned);
    const frameCount = aligned / (2 * channels);
    const buffer = audioContext.createBuffer(channels, frameCount, sampleRate);

    for (let ch = 0; ch < channels; ch += 1) {
      const channel = buffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i += 1) {
        const sample = view.getInt16((i * channels + ch) * 2, true);
        channel[i] = sample / 32768;
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    const startAt = Math.max(nextTime, audioContext.currentTime + 0.02);
    source.start(startAt);
    nextTime = startAt + buffer.duration;

    if (!started) {
      started = true;
      options?.onStart?.();
    }
  };

  try {
    while (!aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      const merged = new Uint8Array(leftover.length + value.length);
      merged.set(leftover, 0);
      merged.set(value, leftover.length);

      const usable = merged.length - (merged.length % (2 * channels));
      if (usable > 0) {
        schedulePcm(merged.subarray(0, usable));
      }
      leftover = merged.subarray(usable);
    }

    if (leftover.length >= 2) {
      schedulePcm(leftover);
    }

    const remainingMs = Math.max(0, (nextTime - audioContext.currentTime) * 1000);
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, remainingMs + 40);
    });
    options?.onEnded?.();
  } finally {
    options?.signal?.removeEventListener("abort", onAbort);
    await audioContext.close().catch(() => undefined);
  }
}
