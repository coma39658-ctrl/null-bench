import encodeQR from "qr";
import decodeQR from "qr/decode.js";
import { QRCanvas, frameLoop, rearCamera } from "qr/dom.js";

async function decodeImageFile(file) {
  if (!(file instanceof Blob) || file.size <= 0 || file.size > 12 * 1024 * 1024) {
    throw new Error("QR_IMAGE_FILE_INVALID");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (_) {
    throw new Error("QR_IMAGE_DECODE_FAILED");
  }
  try {
    const maxDimension = 4096;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("QR_CANVAS_UNAVAILABLE");
    context.drawImage(bitmap, 0, 0, width, height);
    return decodeQR(context.getImageData(0, 0, width, height), { effort: Infinity, timeLimit: Infinity });
  } finally {
    bitmap.close?.();
  }
}

async function startCamera(video, onDecoded) {
  if (!(video instanceof HTMLVideoElement) || typeof onDecoded !== "function") {
    throw new Error("QR_CAMERA_ARGUMENTS_INVALID");
  }
  const scanner = new QRCanvas();
  const camera = await rearCamera(video);
  let stopped = false;
  let busy = false;
  let cancelFrame = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelFrame();
    camera.stop();
  };
  cancelFrame = frameLoop(() => {
    if (stopped || busy) return;
    busy = true;
    Promise.resolve(camera.readFrame(scanner)).then(decoded => {
      if (decoded !== undefined && decoded !== null && !stopped) {
        stop();
        onDecoded(decoded);
      }
    }).catch(() => {}).finally(() => { busy = false; });
  });
  return stop;
}

function encodeSvg(text) {
  if (typeof text !== "string" || text.length > 8192) throw new Error("QR_TEXT_INVALID");
  return encodeQR(text, "svg", { ecc: "quartile", border: 4, optimize: true });
}

globalThis.EZERO_QR = Object.freeze({ encodeSvg, decodeImageFile, startCamera });
