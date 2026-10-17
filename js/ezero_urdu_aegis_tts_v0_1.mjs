const WORKER_URL = new URL("./ezero_urdu_aegis_worker_v0_1.mjs", import.meta.url);

const VOICE_ID = "ur_PK-aegis_female-medium";

let activeAudio = null;
let activeUrl = null;
let generation = 0;

let activeWorker = null;
let cancelActiveWorker = null;
let workerRequestId = 0;

function synthesizeInWorker(text, onProgress) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(WORKER_URL, { type: "module" });
    } catch (error) {
      reject(error);
      return;
    }

    const id = ++workerRequestId;
    let finished = false;

    function finish(error, wav) {
      if (finished) return;
      finished = true;

      if (activeWorker === worker) {
        activeWorker = null;
        cancelActiveWorker = null;
      }

      worker.terminate();

      if (error) reject(error);
      else resolve(wav);
    }

    activeWorker = worker;
    cancelActiveWorker = () =>
      finish(new DOMException("Speech cancelled", "AbortError"));

    worker.onmessage = event => {
      const data = event.data || {};
      if (data.id !== id) return;

      if (data.type === "PROGRESS") {
        if (typeof onProgress === "function") {
          try {
            onProgress(data);
          } catch (error) {
            console.warn("Aegis progress callback error", error);
          }
        }
        return;
      }

      if (data.type === "ERROR") {
        finish(new Error(data.message || "Aegis worker failed"));
        return;
      }

      if (data.type === "DONE") {
        if (!(data.wav instanceof Blob)) {
          finish(new Error("Invalid Aegis audio result"));
          return;
        }
        finish(null, data.wav);
      }
    };

    worker.onerror = event => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      finish(new Error(event.message || "Aegis worker error"));
    };

    worker.onmessageerror = () =>
      finish(new Error("Aegis worker message error"));

    try {
      worker.postMessage({ type: "SPEAK", id, text });
    } catch (error) {
      finish(error);
    }
  });
}


function cleanupAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (_) {}
    activeAudio = null;
  }

  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

let cancelPlayback = null;

function stop() {
  generation += 1;
  if (cancelActiveWorker) cancelActiveWorker();
  if (cancelPlayback) cancelPlayback();
  cleanupAudio();
}

async function prepareAudio(text, options = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("No Urdu text available to speak");
  }

  stop();
  const myGeneration = generation;
  const rateRaw = Number(options.rate);
  const rate = Number.isFinite(rateRaw)
    ? Math.min(1.25, Math.max(0.75, rateRaw))
    : 1;

  const wav = await synthesizeInWorker(
    cleanText,
    options.onProgress
  );

  if (myGeneration !== generation) {
    throw new DOMException("Speech cancelled", "AbortError");
  }

  if (!(wav instanceof Blob) || wav.size <= 44) {
    throw new Error("Invalid Aegis audio");
  }

  activeUrl = URL.createObjectURL(wav);
  activeAudio = new Audio(activeUrl);
  activeAudio.playbackRate = rate;

  return { bytes: wav.size };
}

function playPrepared() {
  const audio = activeAudio;

  if (!audio) {
    return Promise.reject(
      new Error("No prepared Urdu audio")
    );
  }

  return new Promise((resolve, reject) => {
    let finished = false;

    function finish(error) {
      if (finished) return;
      finished = true;

      if (cancelPlayback === abort) {
        cancelPlayback = null;
      }

      if (activeAudio === audio) {
        cleanupAudio();
      }

      if (error) reject(error);
      else resolve();
    }

    function abort() {
      finish(new DOMException(
        "Speech stopped",
        "AbortError"
      ));
    }

    cancelPlayback = abort;

    audio.onended = () => finish(null);
    audio.onerror = () => finish(
      new Error("Aegis audio playback failed")
    );

    try {
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(finish);
      }
    } catch (error) {
      finish(error);
    }
  });
}

async function speak(text, options = {}) {
  await prepareAudio(text, options);
  return playPrepared();
}

window.EZERO_URDU_AEGIS_TTS = Object.freeze({
  voiceId: VOICE_ID,
  engine: "Piper Web",
  language: "ur-PK",
  speak,
  prepareAudio,
  playPrepared,
  stop
});

console.info(
  "E-ZERO Urdu TTS ready:",
  VOICE_ID
);
