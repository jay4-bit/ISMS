'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('barcode-scanner-container');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );
      setActive(true);
      setError('');
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Camera not available or permission denied');
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      } catch {}
      scannerRef.current = null;
    }
    setActive(false);
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
          <div id="barcode-scanner-container" ref={containerRef} style={styles.viewfinder} />
          {error && <div style={styles.error}>{error}</div>}
          {!active && !error && (
            <div style={styles.startPrompt}>
              <CameraOff size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p style={{ color: '#94a3b8', margin: 0 }}>Click Start to open camera</p>
            </div>
          )}
        </div>
        <div style={styles.footer}>
          {!active ? (
            <button onClick={startScanner} style={styles.startBtn}><Camera size={18} /> Start Camera</button>
          ) : (
            <button onClick={() => { stopScanner(); onClose(); }} style={styles.cancelBtn}>Cancel</button>
          )}
          {!active && (
            <button onClick={onClose} style={styles.cancelBtn}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
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
  body: { padding: '1.5rem', minHeight: '200px' },
  viewfinder: { width: '100%', height: '250px', borderRadius: '0.75rem', overflow: 'hidden', background: '#0f172a' },
  error: { marginTop: '0.75rem', color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' },
  startPrompt: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '250px', textAlign: 'center',
  },
  footer: {
    display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem',
    borderTop: '1px solid #334155', justifyContent: 'center',
  },
  startBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem', background: '#334155',
    border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9', cursor: 'pointer',
  },
};
