'use client';

import React from 'react';

// Generates an industrial vector SVG barcode (Code 128 pattern simulation)
export function SvgBarcode({
  value,
  width = 240,
  height = 64,
  showText = true,
}: {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
}) {
  // Deterministic bar widths based on char codes
  const generateBars = (code: string) => {
    const bars: { x: number; w: number }[] = [];
    let currentX = 10;
    const barHeight = height - (showText ? 20 : 6);

    // Guard bars
    bars.push({ x: currentX, w: 2.5 });
    currentX += 4;
    bars.push({ x: currentX, w: 1.5 });
    currentX += 4;

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode >> 1) % 2) + 1.2;
      const w3 = ((charCode >> 2) % 3) + 1;

      bars.push({ x: currentX, w: w1 * 1.4 });
      currentX += w1 * 1.4 + 2;

      bars.push({ x: currentX, w: w2 * 1.1 });
      currentX += w2 * 1.1 + 1.8;

      bars.push({ x: currentX, w: w3 * 1.2 });
      currentX += w3 * 1.2 + 2.2;
    }

    // Stop guard
    bars.push({ x: currentX, w: 2.5 });
    currentX += 4;
    bars.push({ x: currentX, w: 1.5 });

    return { bars, totalWidth: currentX + 12, barHeight };
  };

  const { bars, totalWidth, barHeight } = generateBars(value);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width: '100%', maxWidth: `${width}px`, height: 'auto' }}
        className="text-slate-900"
      >
        <rect width={totalWidth} height={height} fill="white" />
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={4}
            width={bar.w}
            height={barHeight}
            fill="currentColor"
          />
        ))}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height - 2}
            textAnchor="middle"
            fill="currentColor"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="2"
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
}

// Vector stylized QR Code matrix simulation
export function SvgQrCode({
  value,
  size = 80,
}: {
  value: string;
  size?: number;
}) {
  const gridSize = 21;
  const cells: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  // Position detection corner markers (top-left, top-right, bottom-left)
  const drawCorner = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          cells[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawCorner(0, 0);
  drawCorner(gridSize - 7, 0);
  drawCorner(0, gridSize - 7);

  // Pseudo-random deterministic fill based on value string
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Don't overwrite corners
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;

      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        const val = Math.abs((hash ^ (r * 31 + c * 17)) % 100);
        if (val > 48) {
          cells[r][c] = true;
        }
      }
    }
  }

  const cellSize = size / gridSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg shadow-sm bg-white p-1"
    >
      <rect width={size} height={size} fill="white" />
      {cells.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill="#0F172A"
            />
          ) : null
        )
      )}
    </svg>
  );
}
