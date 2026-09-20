import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, Check, ShieldCheck, RefreshCw, Radio, Trash2, CheckCircle2 } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';
import { unpairDevice, fetchPairedDevices } from '../api';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingInfo: {
    host: string;
    port: number;
    token: string;
    code_6digit?: string;
    server_id: string;
    cert_fingerprint?: string;
    pairing_uri?: string;
    expires_in?: number;
  } | null;
  pairedDevices: any[];
  onRefresh: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  pairingInfo,
  pairedDevices: initialPairedDevices,
  onRefresh,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 minutes
  const [devices, setDevices] = useState<any[]>(initialPairedDevices);
  const [newlyPairedDevice, setNewlyPairedDevice] = useState<string | null>(null);

  useEffect(() => {
    setDevices(initialPairedDevices);
  }, [initialPairedDevices]);

  useEffect(() => {
    if (!isOpen || !pairingInfo) return;

    // Use canonical pairing URI or fallback to JSON
    const payload = pairingInfo.pairing_uri || JSON.stringify({
      server_id: pairingInfo.server_id,
      host: pairingInfo.host || window.location.hostname,
      port: pairingInfo.port || 8420,
      token: pairingInfo.token,
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: '#070a12',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error', err));

    setTimeLeft(pairingInfo.expires_in || 120);
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Live status polling every 2.5s for newly paired device
    const pollInterval = setInterval(async () => {
      try {
        const currentDevs = await fetchPairedDevices();
        if (currentDevs && currentDevs.length > devices.length) {
          const newest = currentDevs[currentDevs.length - 1];
          setNewlyPairedDevice(newest.device_name || 'Pixel 8a');
        }
        setDevices(currentDevs);
      } catch (err) {
        // Ignore polling errors
      }
    }, 2500);

    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, [isOpen, pairingInfo]);

  if (!isOpen) return null;

  const handleCopyToken = async () => {
    if (!pairingInfo) return;
    const ok = await copyToClipboard(pairingInfo.token);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (!pairingInfo?.code_6digit) return;
    const ok = await copyToClipboard(pairingInfo.code_6digit);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await unpairDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
    } catch (e) {
      console.error('Failed to unpair device', e);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-card rounded-2xl border border-white/10 shadow-2xl p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pair Your Pixel 8a</h3>
              <p className="text-xs text-slate-400">Scan QR or enter 6-digit code on your phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Notification */}
        {newlyPairedDevice && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully Paired: <strong>{newlyPairedDevice}</strong>. Recordings will auto-sync!</span>
          </div>
        )}

        {/* QR Section */}
        <div className="flex flex-col items-center justify-center my-5">
          <div className="p-3 bg-surface-950 rounded-2xl border border-white/10 shadow-inner relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Pairing QR Code"
                className="w-52 h-52 rounded-xl object-contain"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-500 text-xs font-mono">
                Generating secure QR token...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
            <Radio className={`w-3.5 h-3.5 ${timeLeft > 0 ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
            <span>
              {timeLeft > 0 ? (
                <>Token expires in <strong className="text-white font-mono">{minutes}:{seconds}</strong></>
              ) : (
                <span className="text-rose-400 font-semibold">Token expired. Please refresh.</span>
              )}
            </span>
            <button
              onClick={onRefresh}
              className="ml-2 text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 6-Digit Fallback Code & Server Host */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>6-Digit Code</span>
              <span className="text-[10px] text-slate-500">Fallback</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold tracking-widest text-brand-300">
                {pairingInfo?.code_6digit || '••••••'}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Copy 6-digit code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Host Target</span>
              <span className="text-[10px] text-emerald-400 font-mono">Port {pairingInfo?.port || 8420}</span>
            </div>
            <span className="font-mono text-xs text-slate-300 truncate">
              {pairingInfo?.host || window.location.hostname}
            </span>
          </div>
        </div>

        {/* Paired devices list with Revoke */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authorized Paired Devices ({devices.length})</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              Waiting for phone...
            </span>
          </div>

          {devices.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No devices paired yet. Open the Lecture Whisper app on your Pixel and tap Scan QR.
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {devices.map((dev, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-surface-950 rounded-xl border border-white/5 text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-white">{dev.device_name || 'Pixel 8a'}</span>
                      <p className="text-[11px] text-slate-500 font-mono">{dev.device_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                      Verified
                    </span>
                    <button
                      onClick={() => handleRevokeDevice(dev.device_id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors"
                      title="Revoke device access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
