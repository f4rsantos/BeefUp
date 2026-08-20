let DetectorClass = null
let pending = null

// Nativo (Chrome/Android) grátis; ponyfill (Safari/Firefox) só quando falta.
export function loadBarcodeDetector() {
  if (DetectorClass) return Promise.resolve(DetectorClass)
  if (!pending) {
    pending = (window.BarcodeDetector
      ? Promise.resolve(window.BarcodeDetector)
      : import('barcode-detector/ponyfill').then((m) => m.BarcodeDetector)
    ).then((cls) => { DetectorClass = cls; return cls })
  }
  return pending
}

export function isScanSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}
