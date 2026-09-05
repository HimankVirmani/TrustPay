'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, Image as ImageIcon, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button, DemoNote, TopBar } from '@/components/ui';
import { PaymentComposer } from '@/components/PaymentComposer';
import type { Recipient } from '@/lib/types';

/** Camera-style scanner. A real getUserMedia preview is used when the browser
 *  allows it; the demo QR path works regardless so the flow never dead-ends. */
export default function ScanPage() {
  const { recipients, ready } = useStore();
  const router = useRouter();
  const [picked, setPicked] = useState<Recipient | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camera, setCamera] = useState<'idle' | 'live' | 'denied'>('idle');

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s; setCamera('live');
        const v = document.getElementById('qr-preview') as HTMLVideoElement | null;
        if (v) { v.srcObject = s; v.play().catch(() => { }); }
      })
      .catch(() => setCamera('denied'));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  if (!ready) return <div className="h-screen" />;

  if (picked) {
    return (
      <div>
        <TopBar title="QR payment" onBack={() => setPicked(null)} />
        <PaymentComposer rail="qr" recipient={picked} recipientName={picked.name}
          recipientHandle={picked.upiId} subtitle={`Scanned · ${picked.upiId}`}
          onExit={() => router.push('/')} />
      </div>
    );
  }

  function simulateScan(id: string) {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setPicked(recipients.find((r) => r.id === id) ?? null);
    }, 900);
  }

  return (
    <div className="animate-fade">
      <TopBar title="Scan a QR code" onBack={() => router.push('/')} />

      <div className="relative mx-5 mt-2 aspect-square overflow-hidden rounded-xl2 bg-ink">
        {camera === 'live' && (
          <video id="qr-preview" muted playsInline className="h-full w-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative h-48 w-48">
            {['left-0 top-0 border-l-4 border-t-4 rounded-tl-xl',
              'right-0 top-0 border-r-4 border-t-4 rounded-tr-xl',
              'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl',
              'right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl'].map((c) => (
                <span key={c} className={`absolute h-8 w-8 border-brass ${c}`} />
              ))}
            {scanning && (
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulseRing bg-brass" />
            )}
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-4 text-center text-[12px] font-semibold text-paper/70">
          {scanning ? 'Reading QR code…'
            : camera === 'live' ? 'Point at a UPI QR code'
              : 'Camera unavailable — use a demo code below'}
        </p>
      </div>

      <div className="mt-5 px-5">
        <h2 className="text-[14px] font-extrabold text-ink">Demo QR codes</h2>
        <div className="mt-3 grid gap-2">
          <Button variant="outline" size="lg" className="w-full justify-start"
            onClick={() => simulateScan('r_amit')}>
            <ScanLine size={17} /> Amit Kumar — trusted merchant
          </Button>
          <Button variant="outline" size="lg" className="w-full justify-start"
            onClick={() => simulateScan('r_support')}>
            <Zap size={17} /> Quick Refund Services — reported code
          </Button>
          <Button variant="ghost" size="lg" className="w-full justify-start"
            onClick={() => simulateScan('r_kiran')}>
            <ImageIcon size={17} /> Upload from gallery (simulated)
          </Button>
        </div>
        <DemoNote>
          QR decoding is simulated. Every scanned payment still runs through the same
          risk engine, policy engine and {'\u20B9'}20,000 limit as a typed payment.
        </DemoNote>
      </div>
    </div>
  );
}
