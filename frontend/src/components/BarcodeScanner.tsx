import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'barcode-scanner-region';

  useEffect(() => {
    const scanner = new Html5Qrcode(divId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' }, // Use back camera on mobile
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          onScan(decodedText);
          onClose();
        },
        undefined
      )
      .then(() => setStarted(true))
      .catch((err) => {
        setError(
          typeof err === 'string'
            ? err
            : 'Camera access denied. Allow camera permission and try again.'
        );
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-slate-900 text-sm">Camera Barcode Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scanner Region */}
        <div className="p-4">
          {error ? (
            <div className="text-center py-8 space-y-3">
              <CameraOff className="h-10 w-10 text-rose-400 mx-auto" />
              <p className="text-sm text-rose-600">{error}</p>
              <button onClick={onClose} className="btn-secondary text-xs">Close</button>
            </div>
          ) : (
            <>
              <div
                id={divId}
                className="rounded-xl overflow-hidden bg-black"
                style={{ minHeight: 200 }}
              />
              <p className="text-center text-xs text-slate-400 mt-3">
                {started
                  ? 'Point camera at a barcode or QR code to scan'
                  : 'Starting camera…'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
