import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, Check, ShieldCheck, RefreshCw, Radio } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingInfo: { host: string; port: number; token: string; server_id: string } | null;
  pairedDevices: any[];
  onRefresh: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  pairingInfo,
  pairedDevices,
  onRefresh,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes

  useEffect(() => {
    if (!isOpen || !pairingInfo) return;

    // Payload for mobile app to parse
    const payload = JSON.stringify({
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

    setTimeLeft(300);
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
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
              <h3 className="text-base font-bold text-white">Pair Google Pixel 8a</h3>
              <p className="text-xs text-slate-400">Scan over local Wi-Fi to establish zero-cloud sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Section */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="p-3 bg-surface-950 rounded-2xl border border-white/10 shadow-inner relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Pairing QR Code"
                className="w-56 h-56 rounded-xl object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-500 text-xs font-mono">
                Generating secure token...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Token expires in <strong className="text-white font-mono">{minutes}:{seconds}</strong></span>
            <button
              onClick={onRefresh}
              className="ml-2 text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Manual Token Fallback */}
        <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5 mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>One-Time Pairing Token</span>
            <span className="font-mono text-[11px] text-slate-500">{window.location.hostname}:{pairingInfo?.port || 8420}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-brand-300 bg-surface-900 px-2.5 py-1.5 rounded-lg truncate border border-white/5">
              {pairingInfo?.token || '••••••••••••••••'}
            </code>
            <button
              onClick={handleCopyToken}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Paired devices */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized Paired Devices ({pairedDevices.length})</span>
          </h4>
          {pairedDevices.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No devices paired yet. Open the Lecture Whisper app on your phone and tap Scan QR.</p>
          ) : (
            <div className="space-y-2">
              {pairedDevices.map((dev, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-surface-950 rounded-xl border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-white">{dev.device_name || 'Pixel 8a'}</span>
                      <p className="text-[11px] text-slate-500 font-mono">{dev.device_id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                    Verified LAN
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
