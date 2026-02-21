"use client";

import { useEffect, useRef } from "react";

interface QrScannerProps {
  onResult: (data: string) => void;
  onError?: (err: string) => void;
}

export default function QrScanner({ onResult, onError }: QrScannerProps) {
  const divId = "qr-scanner-container";
  const scannerRef = useRef<unknown>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!mounted) return;

        const scanner = new Html5QrcodeScanner(
          divId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          (decodedText: string) => {
            if (mounted) onResult(decodedText);
          },
          (errorMsg: string) => {
            if (mounted && onError) onError(errorMsg);
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        if (onError) onError(String(err));
      }
    })();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        (scannerRef.current as { clear: () => Promise<void> })
          .clear()
          .catch(() => {});
      }
    };
  }, [onResult, onError]);

  return <div id={divId} />;
}
