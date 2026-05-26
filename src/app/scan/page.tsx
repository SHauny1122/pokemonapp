"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";

type CameraState = "idle" | "requesting" | "ready" | "denied" | "unsupported";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");

  const requestCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraState("ready");
    } catch {
      setCameraState("denied");
    }
  };

  useEffect(() => {
    requestCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState]);

  const startMockScan = () => {
    setIsScanning(true);

    const nextConfidence = Math.random() > 0.45 ? 0.9 : 0.64;

    window.setTimeout(() => {
      router.push(`/scan/result?confidence=${nextConfidence.toFixed(2)}`);
    }, 1100);
  };

  return (
    <MobileShell title="Scan Card" subtitle="Use camera preview to identify a card." showBackButton backFallbackHref="/search">
      <section className="space-y-3">
        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Camera Preview</p>
          <div className="mt-3 rounded-2xl border border-[#2f2f2f] bg-[#101114] p-3">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl border border-dashed border-[#4a4a4a] bg-gradient-to-b from-[#1a1b20] to-[#0b0c0f]">
              {cameraState === "ready" ? (
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-zinc-400">
                  {cameraState === "requesting"
                    ? "Requesting camera access..."
                    : cameraState === "unsupported"
                      ? "This browser does not support camera preview."
                      : "Camera preview unavailable."}
                </div>
              )}
              <div className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-[#e1b54f]" />
              <div className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-[#e1b54f]" />
              <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#e1b54f]" />
              <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[#e1b54f]" />
              <div className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 bg-[#e1b54f]/70" />
              <p className="absolute inset-x-0 bottom-4 text-center text-xs text-zinc-200/90">Live frame</p>
            </div>
          </div>

          <p className="mt-3 text-center text-sm text-zinc-300">Position card inside frame</p>
          <p className="mt-1 text-center text-xs text-zinc-500">
            Camera preview is live when permission is granted. Results should be verified before saving.
          </p>

          {cameraState === "denied" ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#4a3e2a] bg-[#18140f] p-3">
              <p className="text-sm text-zinc-200">Camera access is off right now.</p>
              <p className="mt-1 text-xs text-zinc-400">You can continue manually or try camera permission again.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center rounded-xl border border-[#3d3d3d] bg-[#191b1f] px-2 py-2 text-xs font-medium text-white"
                >
                  Search manually
                </Link>
                <Link
                  href="/sets"
                  className="inline-flex items-center justify-center rounded-xl border border-[#3d3d3d] bg-[#191b1f] px-2 py-2 text-xs font-medium text-white"
                >
                  Browse sets
                </Link>
                <button
                  type="button"
                  onClick={requestCamera}
                  className="inline-flex items-center justify-center rounded-xl border border-[#3d3d3d] bg-[#191b1f] px-2 py-2 text-xs font-medium text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={startMockScan}
            disabled={isScanning}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#e1b54f] px-4 py-3 text-sm font-semibold text-[#141519] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isScanning ? "Scanning..." : "Scan Card"}
          </button>

          {isScanning ? (
            <p className="mt-2 text-center text-xs text-zinc-400">Finding best match from your card catalog...</p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-[#2f2f2f] bg-[#15161a] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Not scanning right now?</p>
          <h3 className="mt-2 text-base font-semibold text-white">Use Search or Deal Check</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Search cards manually, browse sets, or compare asking prices with Deal Check.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-3 py-3 text-sm font-medium text-white"
            >
              Open Search
            </Link>
            <Link
              href="/deal-check"
              className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-3 py-3 text-sm font-medium text-white"
            >
              Open Deal Check
            </Link>
          </div>
        </article>
      </section>
    </MobileShell>
  );
}
