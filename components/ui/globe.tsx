"use client";

import createGlobe, { type COBEOptions } from "cobe";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type GlobeConfig = Partial<
  Omit<COBEOptions, "height" | "onRender" | "width">
>;

export const GLOBE_CONFIG: Omit<COBEOptions, "height" | "onRender" | "width"> =
  {
    devicePixelRatio: 2,
    phi: 0,
    theta: 0.3,
    dark: 0,
    diffuse: 0.4,
    mapSamples: 16000,
    mapBrightness: 1.2,
    baseColor: [1, 1, 1],
    markerColor: [251 / 255, 100 / 255, 21 / 255],
    glowColor: [1, 1, 1],
    markers: [
      { location: [14.5995, 120.9842], size: 0.03 },
      { location: [19.076, 72.8777], size: 0.1 },
      { location: [23.8103, 90.4125], size: 0.05 },
      { location: [30.0444, 31.2357], size: 0.07 },
      { location: [39.9042, 116.4074], size: 0.08 },
      { location: [-23.5505, -46.6333], size: 0.1 },
      { location: [19.4326, -99.1332], size: 0.1 },
      { location: [40.7128, -74.006], size: 0.1 },
      { location: [34.6937, 135.5022], size: 0.05 },
      { location: [41.0082, 28.9784], size: 0.06 },
    ],
  };

export function Globe({
  className,
  config,
}: {
  className?: string;
  config?: GlobeConfig;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const pointerStartRef = useRef<number | null>(null);
  const pointerMovementRef = useRef(0);
  const rotationRef = useRef(0);

  function updatePointerInteraction(value: number | null) {
    pointerStartRef.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value === null ? "grab" : "grabbing";
    }
  }

  function updateMovement(clientX: number) {
    const pointerStart = pointerStartRef.current;
    if (pointerStart === null) {
      return;
    }

    const delta = clientX - pointerStart;
    pointerMovementRef.current = delta;
    rotationRef.current = delta / 200;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.style.cursor = "grab";
    widthRef.current = Math.max(canvas.offsetWidth, 1);
    phiRef.current = config?.phi ?? GLOBE_CONFIG.phi;

    let cleanupResize = () => {};
    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          widthRef.current = Math.max(entry.contentRect.width, 1);
        }
      });

      resizeObserver.observe(canvas);
      cleanupResize = () => resizeObserver.disconnect();
    } else {
      const handleResize = () => {
        widthRef.current = Math.max(canvas.offsetWidth, 1);
      };

      window.addEventListener("resize", handleResize);
      cleanupResize = () => window.removeEventListener("resize", handleResize);
    }

    const hasWebGLSupport =
      typeof WebGLRenderingContext !== "undefined" ||
      typeof WebGL2RenderingContext !== "undefined";

    if (!hasWebGLSupport) {
      canvas.style.opacity = "1";
      return () => {
        cleanupResize();
      };
    }

    let globe: { destroy: () => void } | null = null;
    try {
      globe = createGlobe(canvas, {
        ...GLOBE_CONFIG,
        ...config,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
        onRender: (state) => {
          if (pointerStartRef.current === null) {
            phiRef.current += 0.005;
          }

          state.phi = phiRef.current + rotationRef.current;
          state.width = widthRef.current * 2;
          state.height = widthRef.current * 2;
        },
      });
    } catch {
      canvas.style.opacity = "1";
      return () => {
        cleanupResize();
      };
    }

    const revealTimer = window.setTimeout(() => {
      canvas.style.opacity = "1";
    }, 0);

    return () => {
      window.clearTimeout(revealTimer);
      cleanupResize();
      globe?.destroy();
    };
  }, [config]);

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-square w-full max-w-[540px]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="size-full touch-none select-none opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updatePointerInteraction(event.clientX - pointerMovementRef.current);
        }}
        onPointerMove={(event) => updateMovement(event.clientX)}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          updatePointerInteraction(null);
        }}
        onPointerLeave={() => updatePointerInteraction(null)}
        onPointerCancel={() => updatePointerInteraction(null)}
      />
    </div>
  );
}
