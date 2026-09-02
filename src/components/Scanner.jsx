import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, Flashlight, RefreshCw, Barcode, CheckCircle, AlertCircle } from 'lucide-react';

export default function Scanner({ onScanSuccess, onScanError, isScannerActive, setIsScannerActive }) {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null);

  const html5QrCodeRef = useRef(null);
  const lastScanTimestampRef = useRef(0);
  const isMountedRef = useRef(true);
  const readerElementId = 'pos-camera-reader';

  // Initialize camera list
  useEffect(() => {
    isMountedRef.current = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMountedRef.current) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/rear camera on mobile
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          setActiveCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err);
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Stop scanner helper
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    if (isMountedRef.current) {
      setScannerStarted(false);
      setTorchOn(false);
    }
  };

  // Start / Stop Scanner Effect
  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      if (!isScannerActive) return;

      // Small delay to ensure the DOM element exists
      await new Promise(r => setTimeout(r, 60));
      if (cancelled || !isMountedRef.current) return;

      const container = document.getElementById(readerElementId);
      if (!container) return;

      try {
        setCameraError(null);
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.ITF
            ],
            verbose: false
          });
        }

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.82),
              height: Math.floor(minEdge * 0.58)
            };
          },
          aspectRatio: 1.6
        };

        const cameraIdOrConfig = activeCameraId ? activeCameraId : { facingMode: 'environment' };

        await html5QrCodeRef.current.start(
          cameraIdOrConfig,
          config,
          (decodedText) => {
            const now = Date.now();
            // Debounce: prevent duplicate trigger within 1.2s for same code
            if (decodedText === lastScanTimestampRef.current.code && (now - lastScanTimestampRef.current.time) < 1200) {
              return;
            }

            lastScanTimestampRef.current = { code: decodedText, time: now };
            if (!isMountedRef.current) return;

            setLastScannedCode(decodedText);

            // Visual feedback banner
            setScanFeedback({ success: true, text: decodedText });
            setTimeout(() => {
              if (isMountedRef.current) setScanFeedback(null);
            }, 2500);

            if (onScanSuccess) {
              onScanSuccess(decodedText);
            }
          },
          () => {
            // Frame parse non-match is normal during scanning, ignore
          }
        );

        if (!cancelled && isMountedRef.current) {
          setScannerStarted(true);
          checkTorchCapability();
        }
      } catch (err) {
        console.error('Failed to start camera scanner:', err);
        if (!cancelled && isMountedRef.current) {
          setScannerStarted(false);
          setCameraError(err.message || 'Camera permission denied or camera unavailable');
        }
      }
    }

    if (isScannerActive) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScannerActive, activeCameraId]);

  // Check if camera supports flashlight/torch
  const checkTorchCapability = () => {
    try {
      const videoElement = document.querySelector(`#${readerElementId} video`);
      if (videoElement && videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchSupported(true);
        }
      }
    } catch (e) {
      setTorchSupported(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    try {
      const videoElement = document.querySelector(`#${readerElementId} video`);
      if (videoElement && videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        const newState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: newState }]
        });
        setTorchOn(newState);
      }
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Switch between available cameras
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    stopScanner().then(() => {
      setActiveCameraId(cameras[nextIndex].id);
    });
  };

  // Handle manual code submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setLastScannedCode(manualCode.trim());
    setScanFeedback({ success: true, text: manualCode.trim() });
    setTimeout(() => {
      if (isMountedRef.current) setScanFeedback(null);
    }, 2500);

    if (onScanSuccess) {
      onScanSuccess(manualCode.trim());
    }
    setManualCode('');
  };

  return (
    <div className="pos-card scanner-card" style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: isScannerActive ? 'rgba(5, 150, 105, 0.15)' : '#f1f5f9',
            color: isScannerActive ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Camera size={15} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
            Live Barcode Scanner
          </span>
        </div>

        <button
          className={`btn ${isScannerActive ? 'btn-secondary' : 'btn-primary'}`}
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', minHeight: '32px' }}
          onClick={() => setIsScannerActive(!isScannerActive)}
        >
          {isScannerActive ? (
            <>
              <CameraOff size={13} /> Pause
            </>
          ) : (
            <>
              <Camera size={13} /> Open Camera
            </>
          )}
        </button>
      </div>

      {/* Scanner Box Viewport */}
      {isScannerActive ? (
        <div className="scanner-box" style={{ width: '100%' }}>
          <div className="scanner-viewport">
            {/* PURE DOM CONTAINER for Html5Qrcode - NO REACT CHILDREN EVER */}
            <div id={readerElementId} style={{ width: '100%', height: '100%', minHeight: '180px' }} />

            {/* React Loading Overlay (Sibling to Html5Qrcode container) */}
            {!scannerStarted && !cameraError && (
              <div className="scanner-loading-overlay">
                <RefreshCw size={22} className="spin-animation" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Starting camera...</span>
              </div>
            )}

            {/* React Error Overlay (Sibling to Html5Qrcode container) */}
            {cameraError && (
              <div className="scanner-error-overlay">
                <AlertCircle size={28} color="#ef4444" style={{ margin: '0 auto 0.4rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#dc2626' }}>Camera Unavailable</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', maxWidth: '280px' }}>
                  {cameraError}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: '0.6rem', fontSize: '0.75rem', minHeight: '30px' }}
                  onClick={() => {
                    setCameraError(null);
                    setIsScannerActive(true);
                  }}
                >
                  Retry Camera
                </button>
              </div>
            )}

            {/* Scanner Reticle & Laser Overlay */}
            {scannerStarted && (
              <div className="scanner-overlay">
                <div className="scanner-reticle">
                  <div className="scanner-laser" />
                </div>
              </div>
            )}
          </div>

          {/* Scanner Controls Bar */}
          {scannerStarted && (
            <div className="scanner-controls-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
                <span className="market-pill-dot" /> Scanner Active
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {torchSupported && (
                  <button
                    className={`btn btn-secondary btn-icon ${torchOn ? 'active' : ''}`}
                    style={{ width: '32px', height: '32px', minHeight: '32px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff' }}
                    onClick={toggleTorch}
                    title="Toggle Flashlight"
                  >
                    <Flashlight size={14} color={torchOn ? '#f59e0b' : '#ffffff'} />
                  </button>
                )}

                {cameras.length > 1 && (
                  <button
                    className="btn btn-secondary btn-icon"
                    style={{ width: '32px', height: '32px', minHeight: '32px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff' }}
                    onClick={switchCamera}
                    title="Switch Camera"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => setIsScannerActive(true)}
          style={{
            background: 'var(--bg-input)',
            border: '1px dashed #cbd5e1',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Camera size={26} color="var(--primary)" style={{ margin: '0 auto 0.35rem' }} />
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Camera scanner paused</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Tap here to open camera or type barcode below
          </div>
        </div>
      )}

      {/* Scanned Feedback Notification Toast */}
      {scanFeedback && (
        <div style={{
          position: 'absolute',
          top: '3.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--primary)',
          color: 'white',
          padding: '0.4rem 0.95rem',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          zIndex: 10,
          animation: 'fadeIn 0.2s ease-out',
          whiteSpace: 'nowrap'
        }}>
          <CheckCircle size={14} />
          Scanned: <span style={{ fontFamily: 'var(--font-mono)' }}>{scanFeedback.text}</span>
        </div>
      )}

      {/* Manual Barcode / SKU Input Bar */}
      <form onSubmit={handleManualSubmit} className="manual-barcode-form">
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <input
            type="text"
            className="input-styled input-mono"
            placeholder="Type barcode or SKU..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ paddingLeft: '2.2rem', fontSize: '0.82rem' }}
          />
          <Barcode
            size={15}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
        </div>
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={!manualCode.trim()}
          style={{ padding: '0.55rem 0.85rem', fontSize: '0.8rem', minHeight: '38px', flexShrink: 0 }}
        >
          Add
        </button>
      </form>
    </div>
  );
}
