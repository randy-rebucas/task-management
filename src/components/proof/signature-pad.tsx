"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";

export interface SignaturePadRef {
  clear: () => void;
  getDataUrl: () => string | null;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  className?: string;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 400, height = 200, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const hasStrokes = useRef(false);

    const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

    const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const startDrawing = useCallback((x: number, y: number) => {
      const ctx = getCtx();
      if (!ctx) return;
      isDrawing.current = true;
      hasStrokes.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }, []);

    const draw = useCallback((x: number, y: number) => {
      if (!isDrawing.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    }, []);

    const stopDrawing = useCallback(() => {
      isDrawing.current = false;
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const handleMouseDown = (e: MouseEvent) => {
        const pos = getPos(e, canvas);
        startDrawing(pos.x, pos.y);
      };
      const handleMouseMove = (e: MouseEvent) => {
        const pos = getPos(e, canvas);
        draw(pos.x, pos.y);
      };
      const handleMouseUp = () => stopDrawing();
      const handleMouseLeave = () => stopDrawing();

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getPos(touch, canvas);
        startDrawing(pos.x, pos.y);
      };
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getPos(touch, canvas);
        draw(pos.x, pos.y);
      };
      const handleTouchEnd = () => stopDrawing();

      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseLeave);
      canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      canvas.addEventListener("touchend", handleTouchEnd);

      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);
      };
    }, [startDrawing, draw, stopDrawing]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          hasStrokes.current = false;
        }
      },
      getDataUrl: () => {
        return canvasRef.current?.toDataURL("image/png") ?? null;
      },
      isEmpty: () => !hasStrokes.current,
    }));

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={className}
        style={{ touchAction: "none", cursor: "crosshair" }}
      />
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
