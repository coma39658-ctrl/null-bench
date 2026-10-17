
import { predict } from "./vendor/ezero-piper-urdu/piper-tts-web-urdu.mjs";

const VOICE_ID = "ur_PK-aegis_female-medium";

self.onmessage = async function (event) {
  const request = event.data || {};
  if (request.type !== "SPEAK" ||
      typeof request.text !== "string") return;

  const id = request.id;

  try {
    const wav = await predict(
      { text: request.text, voiceId: VOICE_ID },
      progress => {
        self.postMessage({
          type: "PROGRESS",
          id,
          loaded: Number(progress?.loaded) || 0,
          total: Number(progress?.total) || 0
        });
      }
    );

    self.postMessage({ type: "DONE", id, wav });
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      id,
      message: String(error?.message || error)
    });
  }
};
