import { PERIOD_DAYS } from "./constants";

const colors = {
  text: "#cfcbe6",
  muted: "#a8a4cb",
  violet: "#8b5cf6",
  amber: "#fbbf24",
  green: "#22c55e",
  red: "#ef4444",
  teal: "#2dd4bf",
  blue: "#60a5fa",
  pink: "#f472b6",
  grid: "rgba(255,255,255,0.07)",
  fill1: "rgba(139,92,246,0.35)",
  fill2: "rgba(244,114,182,0.25)"
};

export function drawBurndown(
  canvas: HTMLCanvasElement,
  currentLine: number[],
  projectedLine?: number[]
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const all = currentLine.concat(projectedLine || []);
  let min = Math.min(...all);
  let max = Math.max(...all, 10000);
  min = Math.min(min, 0);
  if (max === min) max = min + 1;

  const padL = 38,
    padR = 12,
    padT = 18,
    padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const xFor = (i: number) => padL + (i / PERIOD_DAYS) * plotW;
  const yFor = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;

  // Grid lines
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (g / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }
  // X labels (Day 1, 10, 20, 30)
  ctx.fillStyle = colors.muted;
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  [1, 10, 20, 30].forEach((d) => {
    const x = xFor(d);
    ctx.fillText("Day " + d, x, h - 6);
  });
  // Y labels
  ctx.textAlign = "right";
  for (let g = 0; g <= 4; g++) {
    const v = min + (1 - g / 4) * (max - min);
    const y = padT + (g / 4) * plotH;
    ctx.fillText("₹" + Math.round(v), padL - 6, y + 4);
  }

  const drawSeries = (line: number[], stroke: string, fill: string | null, dash: number[]) => {
    ctx.beginPath();
    line.forEach((v, i) => {
      const x = xFor(i),
        y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (fill) {
      const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
      grad.addColorStop(0, fill);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.lineTo(xFor(line.length - 1), padT + plotH);
      ctx.lineTo(xFor(0), padT + plotH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    line.forEach((v, i) => {
      const x = xFor(i),
        y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawSeries(currentLine, colors.violet, colors.fill1, []);
  if (projectedLine) {
    drawSeries(projectedLine, colors.amber, colors.fill2, [6, 4]);
  }

  // Budget start marker
  ctx.fillStyle = colors.muted;
  ctx.textAlign = "left";
  ctx.fillText("₹10,000 start", xFor(0) + 4, yFor(10000) - 4);
}

export function drawForecast(
  canvas: HTMLCanvasElement,
  currentLine: number[],
  projectedLine?: number[]
): void {
  drawBurndown(canvas, currentLine, projectedLine);
}

export function drawBurndownBands(
  canvas: HTMLCanvasElement,
  currentLine: number[],
  opts: {
    bestLine?: number[];
    worstLine?: number[];
    projectedLine?: number[];
  } = {}
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bestLine = opts.bestLine || null;
  const worstLine = opts.worstLine || null;
  const projectedLine = opts.projectedLine || null;

  const seriesList = [currentLine, bestLine, worstLine, projectedLine].filter((l): l is number[] =>
    Boolean(l)
  );
  const vals = ([] as number[]).concat(...seriesList);
  const startVal = currentLine[0] ?? 0;
  let min = Math.min(...vals, 0);
  let max = Math.max(...vals, startVal);
  min = Math.min(min, 0);
  if (max === min) max = min + 1;

  const padL = 38,
    padR = 12,
    padT = 18,
    padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const xFor = (i: number) => padL + (i / PERIOD_DAYS) * plotW;
  const yFor = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;

  // Grid lines
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (g / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }
  ctx.fillStyle = colors.muted;
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  [1, 10, 20, 30].forEach((d) => {
    const x = xFor(d);
    ctx.fillText("Day " + d, x, h - 6);
  });
  ctx.textAlign = "right";
  for (let g = 0; g <= 4; g++) {
    const v = min + (1 - g / 4) * (max - min);
    const y = padT + (g / 4) * plotH;
    ctx.fillText("₹" + Math.round(v), padL - 6, y + 4);
  }

  // Filled band between bestLine and worstLine
  if (bestLine && worstLine) {
    ctx.beginPath();
    bestLine.forEach((v, i) => {
      const x = xFor(i),
        y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let i = worstLine.length - 1; i >= 0; i--) {
      const val = worstLine[i] ?? 0;
      ctx.lineTo(xFor(i), yFor(val));
    }
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, "rgba(139,92,246,0.16)");
    grad.addColorStop(1, "rgba(139,92,246,0.02)");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  const drawSeries = (line: number[] | null, stroke: string, dash: number[]) => {
    if (!line) return;
    ctx.beginPath();
    line.forEach((v, i) => {
      const x = xFor(i),
        y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawSeries(currentLine, colors.violet, []);
  if (projectedLine) drawSeries(projectedLine, colors.amber, [6, 4]);

  // Budget start marker
  ctx.fillStyle = colors.muted;
  ctx.textAlign = "left";
  ctx.fillText("₹10,000 start", xFor(0) + 4, yFor(startVal) - 4);
}

export function drawCategory(canvas: HTMLCanvasElement, data: Record<string, number>): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2,
    cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 14;
  const innerR = outerR - 30;

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) {
    ctx.fillStyle = colors.muted;
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No spending yet", cx, cy);
    return;
  }
  const palette = [colors.violet, colors.pink, colors.amber, colors.teal, colors.blue, colors.red];
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  let start = -Math.PI / 2;
  entries.forEach(([_, v], i) => {
    const frac = v / total;
    const end = start + frac * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length] ?? colors.violet;
    ctx.fill();
    start = end;
  });

  // hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#110c1c";
  ctx.fill();

  // center text
  ctx.fillStyle = colors.text;
  ctx.textAlign = "center";
  ctx.font = "bold 22px Space Grotesk, sans-serif";
  ctx.fillText("₹" + Math.round(total).toLocaleString("en-IN"), cx, cy - 2);
  ctx.font = "11px Inter, sans-serif";
  ctx.fillStyle = colors.muted;
  ctx.fillText("total spent", cx, cy + 16);
}

export function drawGauge(el: HTMLElement | null, value: number): void {
  if (!el) return;
  let canvas: HTMLCanvasElement;
  if (el.tagName !== "CANVAS") {
    let child = el.querySelector("canvas");
    if (!child) {
      child = document.createElement("canvas");
      child.width = el.clientWidth || 180;
      child.height = el.clientHeight || 110;
      el.appendChild(child);
    }
    canvas = child;
  } else {
    canvas = el as HTMLCanvasElement;
  }
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2,
    cy = h * 0.95;
  const r = Math.min(w / 2 - 16, h * 0.9);
  const start = Math.PI,
    end = 0;

  // background arc
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.stroke();

  // color stops
  const v = Math.max(0, Math.min(100, value)) / 100;
  const color = v >= 0.67 ? colors.red : v >= 0.34 ? colors.amber : colors.green;
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, start + (end - start) * v);
  ctx.stroke();

  // needle & value
  ctx.fillStyle = color;
  ctx.font = "bold 28px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(Math.round(value)), cx, cy - 6);
  ctx.font = "10px Inter, sans-serif";
  ctx.fillStyle = colors.muted;
  ctx.fillText(v >= 0.67 ? "High risk" : v >= 0.34 ? "Moderate" : "Low risk", cx, cy + 12);
}
