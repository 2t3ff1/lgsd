"use client";

export type PetType = "cat" | "dog" | "fox" | "rabbit" | "shark" | "bear" | "penguin";
export type PetState = "sleeping" | "active" | "dancing";

export const PET_LABELS: Record<PetType, string> = {
  cat: "Katze", dog: "Hund", fox: "Fuchs", rabbit: "Hase",
  shark: "Hai", bear: "Bär", penguin: "Pinguin",
};

// ─── CSS animations ───────────────────────────────────────────────────────────
const STYLES = `
  svg.pet { image-rendering: pixelated; image-rendering: crisp-edges; }
  @keyframes pa-sleep { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(1px)} }
  @keyframes pa-active { 0%,100%{transform:translateY(0px)} 35%{transform:translateY(-3px)} 65%{transform:translateY(-1px)} }
  @keyframes pa-dance {
    0%,100%{transform:rotate(0deg) scale(1) translateY(0px)}
    20%{transform:rotate(-14deg) scale(1.06) translateY(-5px)}
    50%{transform:rotate(14deg) scale(1.06) translateY(-5px)}
    80%{transform:rotate(-7deg) scale(1.03) translateY(-2px)}
  }
  @keyframes pa-zzz1 { 0%{opacity:0;transform:translate(0,0)scale(.6)} 25%{opacity:1} 75%{opacity:1} 100%{opacity:0;transform:translate(3px,-7px)scale(1.1)} }
  @keyframes pa-zzz2 { 0%{opacity:0;transform:translate(0,0)scale(.5)} 25%{opacity:1} 75%{opacity:1} 100%{opacity:0;transform:translate(5px,-10px)scale(1.2)} }
  @keyframes pa-note1 { 0%{opacity:0;transform:translate(0,0)} 25%{opacity:1} 75%{opacity:1} 100%{opacity:0;transform:translate(-3px,-8px)} }
  @keyframes pa-note2 { 0%{opacity:0;transform:translate(0,0)} 25%{opacity:1} 75%{opacity:1} 100%{opacity:0;transform:translate(4px,-8px)} }
  .pa-sleep  { animation: pa-sleep  2.4s ease-in-out infinite; transform-origin: 8px 12px; }
  .pa-active { animation: pa-active 0.8s ease-in-out infinite; transform-origin: 8px 12px; }
  .pa-dance  { animation: pa-dance  0.55s ease-in-out infinite; transform-origin: 8px 12px; }
  .pa-z1 { animation: pa-zzz1 2s ease-in-out infinite; }
  .pa-z2 { animation: pa-zzz2 2s ease-in-out 0.7s infinite; }
  .pa-n1 { animation: pa-note1 1.4s ease-in-out infinite; }
  .pa-n2 { animation: pa-note2 1.4s ease-in-out 0.45s infinite; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type R = { x: number; y: number; w?: number; h?: number; c: string };

function px(x: number, y: number, c: string, w = 1, h = 1) {
  return { x, y, w, h, c };
}

function Rects({ cells }: { cells: R[] }) {
  return (
    <>
      {cells.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w ?? 1} height={r.h ?? 1} fill={r.c} />
      ))}
    </>
  );
}

function ZZZ({ x, y }: { x: number; y: number }) {
  return (
    <>
      <text x={x} y={y} className="pa-z1" fontSize="2.5" fontWeight="bold" fill="#94a3b8" fontFamily="monospace" style={{ userSelect: "none" }}>z</text>
      <text x={x + 2.5} y={y - 3.5} className="pa-z2" fontSize="3.5" fontWeight="bold" fill="#64748b" fontFamily="monospace" style={{ userSelect: "none" }}>Z</text>
    </>
  );
}

function Notes({ x, y }: { x: number; y: number }) {
  return (
    <>
      <text x={x} y={y} className="pa-n1" fontSize="3" fill="#a78bfa" fontFamily="sans-serif" style={{ userSelect: "none" }}>♪</text>
      <text x={x + 4} y={y - 2} className="pa-n2" fontSize="2.5" fill="#c4b5fd" fontFamily="sans-serif" style={{ userSelect: "none" }}>♫</text>
    </>
  );
}

// ─── CAT 🐱 (Schildpatt: orange/schwarz/weiß patches, runder Körper) ──────────
function Cat({ state }: { state: PetState }) {
  const s = state === "sleeping";
  // Schildpatt palette: O=orange, B=black patch, W=white, P=ear-pink, N=nose
  const O = "#E8890C", B = "#2A1A0A", W = "#F8F4EE", P = "#F9A8C9", N = "#FF5577";

  const body: R[] = [
    // left ear (pointy)
    px(2, 0, O), px(3, 0, O),
    px(2, 1, O), px(3, 1, P), px(4, 1, O),
    // right ear
    px(12, 0, B), px(13, 0, B),
    px(11, 1, B), px(12, 1, P), px(13, 1, B),
    // head - round
    px(2, 2, O, 12, 1),
    px(1, 3, O, 14, 1),
    px(1, 4, O, 14, 5),
    px(1, 9, O, 14, 1),
    // tortoiseshell patches on head
    px(2, 3, B, 3, 2), px(6, 4, B, 2, 2), px(10, 3, W, 3, 3),
    px(3, 6, W, 2, 2), px(7, 5, O, 3, 2), px(11, 6, B, 2, 2),
    // chin white
    px(5, 9, W, 6, 1),
    // neck
    px(4, 10, O, 8, 1), px(5, 11, O, 6, 1),
    // body
    px(3, 12, O, 10, 4),
    // body patches
    px(4, 12, B, 3, 2), px(9, 13, W, 3, 2), px(7, 12, O, 2, 1),
    // paws
    px(3, 15, W, 3, 1), px(10, 15, W, 3, 1),
    px(3, 14, B, 2, 1), px(11, 14, B, 2, 1),
    // tail curl (right side)
    px(13, 11, O), px(14, 10, O), px(15, 9, O), px(15, 10, O), px(14, 11, O),
    // nose
    px(7, 7, N), px(8, 7, N),
    // mouth
    px(6, 8, N), px(9, 8, N),
    // whiskers
    px(0, 7, "#CCC", 2, 1), px(14, 7, "#CCC", 2, 1),
    px(0, 8, "#CCC", 2, 1), px(14, 8, "#CCC", 2, 1),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          {/* big round eyes */}
          <rect x={3} y={4} width={3} height={3} fill={B} />
          <rect x={10} y={4} width={3} height={3} fill={B} />
          {/* pupils */}
          <rect x={4} y={4} width={2} height={3} fill="#1A3A1A" />
          <rect x={11} y={4} width={2} height={3} fill="#1A3A1A" />
          {/* shine */}
          <rect x={4} y={4} width={1} height={1} fill="white" />
          <rect x={11} y={4} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={2} y={6} width={5} height={1} fill={B} />
          <rect x={9} y={6} width={5} height={1} fill={B} />
        </>
      )}
      {state === "dancing" && (
        <>
          <rect x={6} y={8} width={1} height={1} fill={N} />
          <rect x={7} y={9} width={2} height={1} fill={N} />
          <rect x={9} y={8} width={1} height={1} fill={N} />
        </>
      )}
      {s && <ZZZ x={13} y={1} />}
      {state === "dancing" && <Notes x={13} y={2} />}
    </g>
  );
}

// ─── DOG 🐶 ──────────────────────────────────────────────────────────────────
function Dog({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#C8884C", D = "#8A5C28", O = "#1A1010", N = "#2A1010", T = "#FF8090";

  const body: R[] = [
    // floppy ears (dark, hang on sides)
    px(0, 4, D, 3, 7), px(13, 4, D, 3, 7),
    // head
    px(2, 2, C, 12, 1), px(1, 3, C, 14, 8), px(2, 11, C, 12, 1),
    // lighter muzzle area
    px(3, 7, "#E0AA70", 10, 4),
    // body
    px(2, 12, C, 12, 5),
    // paws
    px(2, 15, D, 4, 2), px(10, 15, D, 4, 2),
    // nose (dark oval)
    px(5, 7, N, 6, 2),
    // nostrils
    px(6, 8, "#1A0808"), px(9, 8, "#1A0808"),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={4} y={4} width={3} height={3} fill={O} />
          <rect x={9} y={4} width={3} height={3} fill={O} />
          <rect x={5} y={4} width={1} height={1} fill="white" />
          <rect x={10} y={4} width={1} height={1} fill="white" />
          {/* tongue */}
          <rect x={6} y={11} width={4} height={3} fill={T} />
          <rect x={7} y={13} width={1} height={1} fill="#D06070" />
        </>
      )}
      {s && (
        <>
          <rect x={3} y={5} width={5} height={1} fill={O} />
          <rect x={8} y={5} width={5} height={1} fill={O} />
        </>
      )}
      {state === "dancing" && (
        <>
          <rect x={6} y={11} width={4} height={3} fill={T} />
          <rect x={7} y={13} width={1} height={1} fill="#D06070" />
        </>
      )}
      {s && <ZZZ x={14} y={2} />}
      {state === "dancing" && <Notes x={13} y={2} />}
    </g>
  );
}

// ─── FOX 🦊 (orange, sitzend, gelbe Ohrenspitzen, weißes Gesicht, pink Nase) ──
function Fox({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#E8640A", Y = "#FFD84A", W = "#F8F4EE", D = "#1A0A00", N = "#FF6688";

  const body: R[] = [
    // left ear — orange base, yellow tip
    px(2, 0, Y), px(3, 0, Y),
    px(1, 1, Y), px(2, 1, C), px(3, 1, C),
    px(1, 2, C), px(2, 2, C), px(3, 2, C), px(4, 2, C),
    // right ear
    px(12, 0, Y), px(13, 0, Y),
    px(12, 1, C), px(13, 1, C), px(14, 1, Y),
    px(11, 2, C), px(12, 2, C), px(13, 2, C), px(14, 2, C),
    // head (round)
    px(2, 2, C, 12, 1),
    px(1, 3, C, 14, 7),
    px(2, 10, C, 12, 1),
    // white face mask
    px(3, 5, W, 10, 5),
    px(4, 4, W, 8, 1),
    // nose
    px(7, 8, N, 2, 1),
    // body
    px(2, 11, C, 12, 5),
    // white chest
    px(5, 12, W, 6, 4),
    // paws (dark)
    px(2, 15, D, 4, 1), px(10, 15, D, 4, 1),
    // fluffy tail (right)
    px(13, 10, C, 3, 5), px(14, 9, C, 2, 2),
    // white tail tip
    px(13, 15, W, 3, 1), px(14, 14, W, 2, 1),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={4} y={4} width={3} height={3} fill={D} />
          <rect x={9} y={4} width={3} height={3} fill={D} />
          <rect x={5} y={4} width={1} height={1} fill="white" />
          <rect x={10} y={4} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={3} y={6} width={4} height={1} fill={D} />
          <rect x={9} y={6} width={4} height={1} fill={D} />
        </>
      )}
      {s && <ZZZ x={14} y={1} />}
      {state === "dancing" && <Notes x={13} y={2} />}
    </g>
  );
}

// ─── RABBIT 🐰 (weiß, sehr lange Ohren mit rosa Innen, minimalistisch) ────────
function Rabbit({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#F5F2EC", D = "#D8D0C0", P = "#F9A8C9", O = "#2A1A1A", N = "#FF88AA";

  const body: R[] = [
    // very long left ear
    px(4, 0, C, 3, 8), px(5, 0, P, 1, 7),
    px(3, 1, C, 1, 4),
    // very long right ear
    px(9, 0, C, 3, 8), px(10, 0, P, 1, 7),
    px(12, 1, C, 1, 4),
    // head (round oval)
    px(2, 6, C, 12, 6),
    px(1, 7, C, 14, 4),
    px(2, 11, C, 12, 1),
    // body (oval)
    px(2, 12, C, 12, 4),
    px(3, 11, C, 10, 1),
    px(3, 16, D, 10, 1),
    // subtle shading on sides
    px(2, 8, D, 1, 3), px(13, 8, D, 1, 3),
    // nose
    px(7, 9, N, 2, 1),
    // mouth
    px(6, 10, N), px(9, 10, N),
    // paw hints
    px(2, 14, D, 3, 2), px(11, 14, D, 3, 2),
    // fluffy round tail
    px(13, 12, C, 3, 3), px(14, 11, C, 2, 1),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={5} y={7} width={3} height={3} fill={O} />
          <rect x={8} y={7} width={3} height={3} fill={O} />
          <rect x={6} y={7} width={1} height={1} fill="white" />
          <rect x={9} y={7} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={4} y={8} width={4} height={1} fill={O} />
          <rect x={8} y={8} width={4} height={1} fill={O} />
        </>
      )}
      {s && <ZZZ x={13} y={3} />}
      {state === "dancing" && <Notes x={13} y={4} />}
    </g>
  );
}

// ─── SHARK 🦈 (blaugrau, von der Seite, Flosse oben, leicht lächelnd) ──────────
function Shark({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#6BA3C8", D = "#3A6A90", W = "#EEF4F8", O = "#1A1010";

  const body: R[] = [
    // dorsal fin (tall)
    px(7, 0, D), px(7, 1, D), px(8, 1, D),
    px(6, 2, C), px(7, 2, C), px(8, 2, C), px(9, 2, C),
    px(5, 3, C), px(6, 3, C), px(7, 3, C), px(8, 3, C), px(9, 3, C), px(10, 3, C),
    // snout (left, pointed)
    px(0, 6, C), px(0, 7, C), px(1, 5, C), px(1, 8, C),
    // main torpedo body
    px(1, 4, C, 13, 1),
    px(1, 5, C, 14, 6),
    px(1, 11, C, 13, 1),
    // lighter belly
    px(2, 6, W, 9, 4),
    // tail fork (right)
    px(14, 3, D, 2, 2), px(14, 9, D, 2, 2),
    px(15, 5, D, 1, 4),
    // pectoral fin (bottom)
    px(5, 11, D, 4, 2),
    // darker top stripe
    px(1, 4, D, 13, 1), px(1, 5, D, 3, 1), px(10, 5, D, 4, 1),
    // smile teeth
    px(2, 9, W), px(4, 9, W), px(6, 9, W), px(8, 9, W),
    // mouth line
    px(1, 9, D, 10, 1),
    // slight smile curve
    px(2, 10, D), px(9, 10, D),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          {/* small eye */}
          <rect x={3} y={6} width={2} height={2} fill={O} />
          <rect x={4} y={6} width={1} height={1} fill={W} />
        </>
      )}
      {s && <rect x={2} y={7} width={3} height={1} fill={O} />}
      {s && <ZZZ x={9} y={1} />}
      {state === "dancing" && <Notes x={10} y={2} />}
    </g>
  );
}

// ─── BEAR 🐻 ──────────────────────────────────────────────────────────────────
function Bear({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#7A4828", D = "#4A2818", M = "#A87050", O = "#1A1010", N = "#1A0808";

  const body: R[] = [
    // left ear
    px(1, 1, C, 4, 3), px(2, 1, D, 2, 2),
    // right ear
    px(11, 1, C, 4, 3), px(12, 1, D, 2, 2),
    // head
    px(1, 3, C, 14, 8),
    // muzzle (lighter round area)
    px(4, 7, M, 8, 4),
    // nose
    px(6, 8, N, 4, 2),
    // nostrils
    px(7, 9, D), px(9, 9, D),
    // body
    px(1, 11, C, 14, 6),
    // belly (lighter)
    px(4, 12, M, 8, 4),
    // paws
    px(1, 15, D, 4, 2), px(11, 15, D, 4, 2),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={3} y={5} width={3} height={2} fill={O} />
          <rect x={10} y={5} width={3} height={2} fill={O} />
          <rect x={4} y={5} width={1} height={1} fill="white" />
          <rect x={11} y={5} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={2} y={6} width={5} height={1} fill={O} />
          <rect x={9} y={6} width={5} height={1} fill={O} />
        </>
      )}
      {state === "dancing" && (
        <>
          <rect x={6} y={11} width={4} height={1} fill={M} />
          <rect x={5} y={12} width={6} height={1} fill={M} />
        </>
      )}
      {s && <ZZZ x={14} y={2} />}
      {state === "dancing" && <Notes x={13} y={3} />}
    </g>
  );
}

// ─── PENGUIN 🐧 ───────────────────────────────────────────────────────────────
function Penguin({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const B = "#1A1A2E", W = "#F0F4FF", G = "#2A2A4A", O = "#FF8C00", E = "#1A1010";

  const body: R[] = [
    // head
    px(3, 0, B, 10, 6),
    // white face
    px(4, 1, W, 8, 4),
    // beak
    px(6, 5, O, 4, 2),
    // body
    px(1, 6, B, 14, 9),
    // white belly
    px(4, 7, W, 8, 7),
    // left wing
    px(0, 7, G, 3, 6),
    // right wing
    px(13, 7, G, 3, 6),
    // feet
    px(3, 15, O, 4, 2), px(9, 15, O, 4, 2),
    // feet toes
    px(2, 16, O), px(4, 16, O), px(5, 16, O),
    px(8, 16, O), px(10, 16, O), px(11, 16, O),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={5} y={2} width={2} height={2} fill={E} />
          <rect x={9} y={2} width={2} height={2} fill={E} />
          <rect x={6} y={2} width={1} height={1} fill="white" />
          <rect x={10} y={2} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={4} y={3} width={4} height={1} fill={E} />
          <rect x={8} y={3} width={4} height={1} fill={E} />
        </>
      )}
      {/* bow tie for dancing */}
      {state === "dancing" && (
        <>
          <rect x={6} y={6} width={1} height={2} fill="#E040FB" />
          <rect x={9} y={6} width={1} height={2} fill="#E040FB" />
          <rect x={7} y={7} width={2} height={1} fill="#E040FB" />
        </>
      )}
      {s && <ZZZ x={13} y={0} />}
      {state === "dancing" && <Notes x={13} y={2} />}
    </g>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

const ANIMALS: Record<PetType, (props: { state: PetState }) => JSX.Element> = {
  cat: Cat, dog: Dog, fox: Fox, rabbit: Rabbit,
  shark: Shark, bear: Bear, penguin: Penguin,
};

export function PetAnimal({ type, state, size = 80 }: {
  type: PetType; state: PetState; size?: number;
}) {
  const Animal = ANIMALS[type] ?? Cat;
  return (
    <svg
      className="pet"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      overflow="visible"
    >
      {/* dangerouslySetInnerHTML bypasses React 18.3 style-hoisting which breaks SVG inline styles */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Animal state={state} />
    </svg>
  );
}
