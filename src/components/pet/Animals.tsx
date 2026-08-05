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

// ─── CAT 🐱 ──────────────────────────────────────────────────────────────────
// palette: C=orange D=dark-orange P=ear-pink O=pupil N=nose
function Cat({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#F4A030", D = "#C07820", P = "#FFBFCF", O = "#1A1010", N = "#FF7090";

  const body: R[] = [
    // left ear
    px(2, 0, C), px(2, 1, C), px(3, 1, P), px(2, 2, C), px(3, 2, C), px(3, 2, P),
    // right ear
    px(13, 0, C), px(12, 1, C), px(13, 1, P), px(12, 2, C), px(13, 2, C), px(12, 2, P),
    // head rows 2-9
    px(2, 2, C, 12, 1), px(2, 3, C, 12, 6), px(2, 9, C, 12, 1),
    // chin/neck
    px(3, 10, C, 10, 1), px(4, 11, C, 8, 1),
    // body
    px(3, 12, C, 10, 4),
    // paws
    px(3, 14, D, 3, 2), px(10, 14, D, 3, 2),
    // tail (right)
    px(13, 13, D), px(14, 12, D), px(14, 11, D), px(15, 10, D), px(15, 9, D),
    // nose
    px(7, 7, N), px(8, 7, N),
    // mouth
    px(6, 8, N), px(9, 8, N),
    // whiskers
    px(0, 7, "#BBB"), px(1, 7, "#BBB"), px(14, 7, "#BBB"), px(15, 7, "#BBB"),
    px(0, 8, "#BBB"), px(1, 8, "#BBB"), px(14, 8, "#BBB"), px(15, 8, "#BBB"),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {/* eyes */}
      {!s && (
        <>
          <rect x={4} y={5} width={2} height={2} fill={O} />
          <rect x={10} y={5} width={2} height={2} fill={O} />
          <rect x={5} y={5} width={1} height={1} fill="white" />
          <rect x={11} y={5} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={3} y={6} width={4} height={1} fill={O} />
          <rect x={9} y={6} width={4} height={1} fill={O} />
        </>
      )}
      {/* smile when dancing */}
      {state === "dancing" && (
        <>
          <rect x={6} y={8} width={1} height={1} fill={N} />
          <rect x={7} y={9} width={2} height={1} fill={N} />
          <rect x={9} y={8} width={1} height={1} fill={N} />
        </>
      )}
      {s && <ZZZ x={13} y={2} />}
      {state === "dancing" && <Notes x={13} y={3} />}
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

// ─── FOX 🦊 ──────────────────────────────────────────────────────────────────
function Fox({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#E0601A", D = "#1A1010", W = "#F5F5F0", N = "#1A1010";

  const body: R[] = [
    // left ear (pointy, dark tip)
    px(1, 0, D), px(2, 0, D), px(1, 1, D), px(2, 1, C), px(3, 1, C),
    px(1, 2, C), px(2, 2, C), px(3, 2, C), px(4, 2, C),
    // right ear
    px(13, 0, D), px(14, 0, D), px(12, 1, C), px(13, 1, C), px(14, 1, D),
    px(11, 2, C), px(12, 2, C), px(13, 2, C), px(14, 2, C),
    // head
    px(2, 2, C, 12, 9),
    // white cheek/snout area
    px(3, 6, W, 10, 5),
    // snout tip (darker)
    px(6, 9, N, 4, 1),
    // body
    px(2, 11, C, 12, 5),
    // white chest
    px(5, 12, W, 6, 3),
    // paws
    px(2, 15, D, 4, 1), px(10, 15, D, 4, 1),
    // tail hint (right)
    px(13, 12, C, 3, 4), px(14, 11, C, 2, 2),
    // tail white tip
    px(14, 15, W, 2, 1),
    // nose
    px(7, 8, D, 2, 1),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={4} y={4} width={3} height={2} fill={D} />
          <rect x={9} y={4} width={3} height={2} fill={D} />
          <rect x={5} y={4} width={1} height={1} fill="white" />
          <rect x={10} y={4} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={3} y={5} width={4} height={1} fill={D} />
          <rect x={9} y={5} width={4} height={1} fill={D} />
        </>
      )}
      {s && <ZZZ x={14} y={1} />}
      {state === "dancing" && <Notes x={13} y={2} />}
    </g>
  );
}

// ─── RABBIT 🐰 ────────────────────────────────────────────────────────────────
function Rabbit({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#F0EAD6", D = "#C8BCAA", P = "#FFB0C8", O = "#1A1010", N = "#FF88AA";

  const body: R[] = [
    // left ear (tall, thin)
    px(4, 0, C, 3, 6), px(5, 0, P, 1, 5),
    // right ear
    px(9, 0, C, 3, 6), px(10, 0, P, 1, 5),
    // head
    px(2, 5, C, 12, 7),
    // face shading
    px(3, 6, D, 1, 1), px(12, 6, D, 1, 1),
    // nose
    px(7, 9, N, 2, 1),
    // mouth
    px(6, 10, N), px(9, 10, N),
    // neck / body
    px(3, 12, C, 10, 5),
    // paw hints
    px(2, 14, D, 3, 2), px(11, 14, D, 3, 2),
    // fluffy tail
    px(12, 13, C, 3, 3),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={5} y={7} width={2} height={2} fill={O} />
          <rect x={9} y={7} width={2} height={2} fill={O} />
          <rect x={6} y={7} width={1} height={1} fill="white" />
          <rect x={10} y={7} width={1} height={1} fill="white" />
        </>
      )}
      {s && (
        <>
          <rect x={4} y={8} width={4} height={1} fill={O} />
          <rect x={8} y={8} width={4} height={1} fill={O} />
        </>
      )}
      {s && <ZZZ x={13} y={4} />}
      {state === "dancing" && <Notes x={13} y={4} />}
    </g>
  );
}

// ─── SHARK 🦈 ─────────────────────────────────────────────────────────────────
function Shark({ state }: { state: PetState }) {
  const s = state === "sleeping";
  const C = "#4A90C0", D = "#2C608A", W = "#F0F4F8", O = "#1A1010";

  const body: R[] = [
    // dorsal fin
    px(6, 0, C), px(6, 1, C), px(7, 1, C), px(5, 2, C), px(6, 2, C),
    px(7, 2, C), px(8, 2, C), px(5, 3, C), px(6, 3, C), px(7, 3, C), px(8, 3, C), px(9, 3, C),
    // main body (torpedo)
    px(1, 4, C, 14, 4), px(0, 5, C, 16, 2), px(1, 8, C, 14, 3),
    // white belly
    px(3, 5, W, 10, 4),
    // left pectoral fin
    px(0, 6, D, 2, 3),
    // right pectoral fin
    px(14, 6, D, 2, 3),
    // tail fin (right)
    px(14, 4, D, 2, 1), px(15, 5, D, 1, 3), px(14, 8, D, 2, 1),
    // darker back
    px(1, 4, D, 14, 1),
    // teeth
    px(3, 9, W), px(5, 9, W), px(7, 9, W), px(9, 9, W), px(11, 9, W),
    px(4, 10, W), px(6, 10, W), px(8, 10, W), px(10, 10, W),
    // mouth line
    px(2, 9, D, 12, 1),
  ];

  return (
    <g className={`pa-${state}`}>
      <Rects cells={body} />
      {!s && (
        <>
          <rect x={4} y={6} width={2} height={2} fill={O} />
          <rect x={5} y={6} width={1} height={1} fill="white" />
        </>
      )}
      {s && <rect x={3} y={7} width={4} height={1} fill={O} />}
      {s && <ZZZ x={8} y={1} />}
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
