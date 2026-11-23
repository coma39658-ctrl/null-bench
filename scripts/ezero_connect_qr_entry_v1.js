import encodeQR from "qr";
import decodeQR from "qr/decode.js";


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
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("QR_CAMERA_UNSUPPORTED");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("QR_CANVAS_UNAVAILABLE");
  let stream;
  let stopped = false;
  let frameHandle = 0;
  let torchOn = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    if (stream) for (const track of stream.getTracks()) track.stop();
    stream = undefined;
    video.pause();
    video.srcObject = null;
  };

  async function attachCamera(constraints) {
    const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints });
    if (stopped) {
      for (const track of next.getTracks()) track.stop();
      return;
    }
    if (stream) for (const track of stream.getTracks()) track.stop();
    stream = next;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = next;
    await video.play();
  }

  try {
    await attachCamera({
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    });
  } catch (error) {
    stop();
    throw error;
  }

  stop.cameraCount = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === "videoinput").length;
  };
  stop.switchCamera = async () => {
    if (stopped || !stream) throw new Error("QR_CAMERA_STOPPED");
    const devices = (await navigator.mediaDevices.enumerateDevices())
      .filter(device => device.kind === "videoinput");
    if (devices.length < 2) throw new Error("QR_CAMERA_SWITCH_UNAVAILABLE");
    const currentId = stream.getVideoTracks()[0]?.getSettings?.().deviceId || "";
    const currentIndex = devices.findIndex(device => device.deviceId === currentId);
    const next = currentIndex >= 0 ? devices[(currentIndex + 1) % devices.length] : (devices[1] || devices[0]);
    await attachCamera({ deviceId: { exact: next.deviceId } });
    torchOn = false;
    return next.label || "Camera";
  };
  stop.torchSupported = () => {
    const track = stream?.getVideoTracks?.()[0];
    try { return !!track?.getCapabilities?.().torch; } catch (_) { return false; }
  };
  stop.toggleTorch = async () => {
    if (stopped || !stream) throw new Error("QR_CAMERA_STOPPED");
    const track = stream.getVideoTracks()[0];
    let capabilities = {};
    try { capabilities = track?.getCapabilities?.() || {}; } catch (_) {}
    if (!track || !capabilities.torch) throw new Error("QR_TORCH_UNSUPPORTED");
    torchOn = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: torchOn }] });
    return torchOn;
  };

  const scanFrame = () => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        const width = Math.max(1, Math.round(video.videoWidth * scale));
        const height = Math.max(1, Math.round(video.videoHeight * scale));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        const decoded = decodeQR(context.getImageData(0, 0, width, height), {
          effort: 2,
          timeLimit: 10
        });
        if (typeof decoded === "string" && decoded.length > 0) {
          stop();
          onDecoded(decoded);
          return;
        }
      } catch (_) {
        // A frame without a QR code is expected; keep scanning the next frame.
      }
    }
    if (!stopped) frameHandle = requestAnimationFrame(scanFrame);
  };
  frameHandle = requestAnimationFrame(scanFrame);
  return stop;
}

function encodeDataUrl(text) {
  if (typeof text !== "string" || text.length > 8192) throw new Error("QR_TEXT_INVALID");
  return encodeQR(text, "data-url", { ecc: "quartile", border: 4, scale: 6 });
}

globalThis.EZERO_QR = Object.freeze({ encodeDataUrl, decodeImageFile, startCamera });
