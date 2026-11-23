import encodeQR from "qr";
import decodeQR from "qr/decode.js";
import { QRCanvas, frameLoop, rearCamera } from "qr/dom.js";

async function decodeImageFile(file) {
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif", "image/bmp"]);
  if (!(file instanceof Blob) || !allowedTypes.has(file.type.toLowerCase()) || file.size <= 0 || file.size > 8 * 1024 * 1024) {
    throw new Error("QR_IMAGE_FILE_INVALID");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (_) {
    throw new Error("QR_IMAGE_DECODE_FAILED");
  }
  try {
    const maxDimension = 2048;
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
  let torchOn = false;
  let cancelFrame = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelFrame();
    camera.stop();
  };
  // Expose only user-invoked camera controls; never open another camera implicitly.
  stop.cameraCount = async () => (await camera.listDevices()).length;
  stop.switchCamera = async () => {
    if (stopped) throw new Error("QR_CAMERA_STOPPED");
    const devices = await camera.listDevices();
    if (devices.length < 2) throw new Error("QR_CAMERA_SWITCH_UNAVAILABLE");
    const currentId = video.srcObject?.getVideoTracks?.()[0]?.getSettings?.().deviceId || "";
    const currentIndex = devices.findIndex(device => device.deviceId === currentId);
    const next = currentIndex >= 0 ? devices[(currentIndex + 1) % devices.length] : (devices[1] || devices[0]);
    await camera.setDevice(next.deviceId);
    torchOn = false;
    return next.label;
  };
  stop.torchSupported = () => {
    const track = video.srcObject?.getVideoTracks?.()[0];
    try { return !!track?.getCapabilities?.().torch; } catch (_) { return false; }
  };
  stop.toggleTorch = async () => {
    if (stopped) throw new Error("QR_CAMERA_STOPPED");
    const track = video.srcObject?.getVideoTracks?.()[0];
    let capabilities = {};
    try { capabilities = track?.getCapabilities?.() || {}; } catch (_) {}
    if (!track || !capabilities.torch) throw new Error("QR_TORCH_UNSUPPORTED");
    torchOn = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: torchOn }] });
    return torchOn;
  };
  cancelFrame = frameLoop(() => {
    if (stopped || busy) return;
    busy = true;
    Promise.resolve().then(() => camera.readFrame(scanner)).then(decoded => {
      if (decoded !== undefined && decoded !== null && !stopped) {
        stop();
        onDecoded(decoded);
      }
    }).catch(() => {}).finally(() => { busy = false; });
  });
  return stop;
}

function encodeDataUrl(text) {
  if (typeof text !== "string" || text.length > 8192) throw new Error("QR_TEXT_INVALID");
  return encodeQR(text, "data-url", { ecc: "quartile", border: 4, scale: 6 });
}

globalThis.EZERO_QR = Object.freeze({ encodeDataUrl, decodeImageFile, startCamera });
