/* E-ZERO Connect QR runtime — same-origin, no network calls. */
(() => {
  "use strict";
  const allowedTypes = new Set([
    "image/png", "image/jpeg", "image/webp", "image/avif",
    "image/gif", "image/bmp"
  ]);

  function barcodeDetector() {
    if (typeof window.BarcodeDetector !== "function") {
      throw new Error("QR_SCANNER_UNSUPPORTED");
    }
    return new window.BarcodeDetector({ formats: ["qr_code"] });
  }

  function encodeDataUrl(value) {
    if (typeof value !== "string" || !value || value.length > 8192) {
      throw new Error("QR_TEXT_INVALID");
    }
    if (typeof window.qrcode !== "function") {
      throw new Error("QR_ENCODER_UNAVAILABLE");
    }
    const qr = window.qrcode(0, "Q");
    qr.addData(value, "Byte");
    qr.make();
    return qr.createDataURL(6, 4);
  }

  async function decodeImageFile(file) {
    if (!(file instanceof Blob) || !allowedTypes.has(String(file.type).toLowerCase()) ||
        file.size <= 0 || file.size > 8 * 1024 * 1024) {
      throw new Error("QR_IMAGE_FILE_INVALID");
    }
    if (typeof createImageBitmap !== "function") {
      throw new Error("QR_IMAGE_DECODE_UNSUPPORTED");
    }
    const detector = barcodeDetector();
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const matches = await detector.detect(bitmap);
      const value = matches?.find(item => item.format === "qr_code")?.rawValue;
      if (typeof value !== "string" || !value) throw new Error("QR_NOT_FOUND_IN_IMAGE");
      return value;
    } finally {
      bitmap?.close?.();
    }
  }

  async function startCamera(video, onDecoded) {
    if (!(video instanceof HTMLVideoElement) || typeof onDecoded !== "function") {
      throw new Error("QR_CAMERA_ARGUMENTS_INVALID");
    }
    const detector = barcodeDetector();
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("QR_CAMERA_UNAVAILABLE");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    let stopped = false;
    let busy = false;
    let frame = 0;
    let failures = 0;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) track.stop();
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    };
    try {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
    } catch (error) {
      stop();
      throw error;
    }
    const scan = async () => {
      if (stopped) return;
      if (!busy && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        busy = true;
        try {
          const matches = await detector.detect(video);
          failures = 0;
          const value = matches?.find(item => item.format === "qr_code")?.rawValue;
          if (typeof value === "string" && value) {
            stop();
            onDecoded(value);
            return;
          }
        } catch (_) {
          failures += 1;
          if (failures >= 8) {
            stop();
            return;
          }
        } finally {
          busy = false;
        }
      }
      if (!stopped) frame = requestAnimationFrame(scan);
    };
    frame = requestAnimationFrame(scan);
    return stop;
  }

  window.EZERO_QR = Object.freeze({ encodeDataUrl, decodeImageFile, startCamera });
})();
