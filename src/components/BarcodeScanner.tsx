'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, Flashlight, FlashlightOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [status, setStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('barcode-scanner-container', { verbose: false, useBarCodeDetectorIfSupported: true, formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.MAXICODE,
        ],
      });
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 30 },
        (decodedText: string) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );
      setStatus('active');
      checkTorch();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (msg.includes('NotFoundError')) {
        setErrorMsg('No camera found on this device.');
      } else if (msg.includes('NotReadableError')) {
        setErrorMsg('Camera is being used by another application.');
      } else if (msg.includes('Secure context')) {
        setErrorMsg('Camera requires HTTPS (secure context). The app must be served over HTTPS or localhost.');
      } else {
        setErrorMsg(`Camera error: ${err?.message || 'Unknown error'}`);
      }
      setStatus('error');
    }
  }

  function checkTorch() {
    try {
      const caps = scannerRef.current?.getRunningTrackCameraCapabilities?.();
      if (caps?.torchFeature?.().isSupported?.()) {
        setTorchSupported(true);
      }
    } catch {}
  }

  async function toggleTorch() {
    try {
      const caps = scannerRef.current?.getRunningTrackCameraCapabilities?.();
      if (caps?.torchFeature?.().isSupported?.()) {
        const newState = !torchOn;
        await caps.torchFeature().apply(newState);
        setTorchOn(newState);
      }
    } catch {}
  }

  function stopScanner() {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      } catch {}
      scannerRef.current = null;
    }
    setStatus('starting');
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <Camera size={20} />
          <span style={{ fontWeight: '600' }}>Scan Barcode</span>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>
        <div style={styles.body}>
          <div id="barcode-scanner-container" style={styles.viewfinder} />
          {status !== 'active' && (
            <div style={styles.overlayBox}>
              {status === 'starting' && (
                <>
                  <Loader2 size={32} className="spin" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                  <p style={{ color: '#94a3b8', margin: 0 }}>Starting camera...</p>
                </>
              )}
              {status === 'error' && (
                <p style={{ color: '#ef4444', textAlign: 'center', margin: 0 }}>{errorMsg}</p>
              )}
            </div>
          )}
        </div>
        <div style={styles.footer}>
          {status === 'active' && torchSupported && (
            <button onClick={toggleTorch} style={{ ...styles.flashBtn, background: torchOn ? '#f59e0b' : '#334155' }}>
              {torchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
              {torchOn ? 'Flash Off' : 'Flash On'}
            </button>
          )}
          {status === 'error' && (
            <button onClick={startScanner} style={styles.retryBtn}>Retry</button>
          )}
          <button onClick={onClose} style={styles.cancelBtn}>Close</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem',
  },
  modal: {
    background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155',
    maxWidth: '450px', width: '100%', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1rem 1.5rem', borderBottom: '1px solid #334155', color: '#f1f5f9',
  },
  closeBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  body: { padding: '1.5rem', position: 'relative' },
  viewfinder: { width: '100%', height: '280px', borderRadius: '0.75rem', overflow: 'hidden', background: '#0f172a' },
  overlayBox: {
    position: 'absolute', inset: '1.5rem', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  },
  footer: {
    display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem',
    borderTop: '1px solid #334155', justifyContent: 'center',
  },
  flashBtn: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.7rem 1.2rem', border: '1px solid #475569',
    borderRadius: '0.5rem', color: '#f1f5f9', fontWeight: '600', cursor: 'pointer',
  },
  retryBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem', background: '#334155',
    border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9', cursor: 'pointer',
  },
};
