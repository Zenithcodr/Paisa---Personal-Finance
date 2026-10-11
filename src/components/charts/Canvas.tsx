import { useEffect, useRef } from "react";

type DrawFn = (canvas: HTMLCanvasElement) => void;

interface CanvasProps {
  draw: DrawFn;
  width: number;
  height: number;
  ariaLabel: string;
  className?: string;
}

/** Renders a canvas and (re)draws it with the provided draw function each render. */
export function Canvas({ draw, width, height, ariaLabel, className }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) draw(ref.current);
  });
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  );
}
