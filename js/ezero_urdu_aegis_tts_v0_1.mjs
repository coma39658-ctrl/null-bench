import { predict } from "./vendor/ezero-piper-urdu/piper-tts-web-urdu.mjs";

const VOICE_ID = "ur_PK-aegis_female-medium";

let activeAudio = null;
let activeUrl = null;
let generation = 0;

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

function stop() {
  generation += 1;
  cleanupAudio();
}

async function speak(text, options = {}) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("No Urdu text available to speak");
  }

  const myGeneration = ++generation;
  cleanupAudio();

  const rateRaw = Number(options.rate);
  const rate =
    Number.isFinite(rateRaw)
      ? Math.min(1.25, Math.max(0.75, rateRaw))
      : 1;

  const wav = await predict(
    {
      text: cleanText,
      voiceId: VOICE_ID
    },
    progress => {
      if (
        typeof options.onProgress === "function" &&
        progress
      ) {
        options.onProgress(progress);
      }
    }
  );

  if (myGeneration !== generation) {
    throw new DOMException("Speech cancelled", "AbortError");
  }

  activeUrl = URL.createObjectURL(wav);
  const audio = new Audio(activeUrl);
  activeAudio = audio;
  audio.playbackRate = rate;

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      if (activeAudio === audio) {
        cleanupAudio();
      }
      resolve();
    };

    audio.onerror = () => {
      if (activeAudio === audio) {
        cleanupAudio();
      }
      reject(new Error("Aegis audio playback failed"));
    };

    audio.play().catch(error => {
      if (activeAudio === audio) {
        cleanupAudio();
      }
      reject(error);
    });
  });
}

window.EZERO_URDU_AEGIS_TTS = Object.freeze({
  voiceId: VOICE_ID,
  engine: "Piper Web",
  language: "ur-PK",
  speak,
  stop
});

console.info(
  "E-ZERO Urdu TTS ready:",
  VOICE_ID
);
