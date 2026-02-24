import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// ── Individual floating orb ───────────────────────────────────────────────────
interface OrbProps {
  size: number;
  x: number;
  y: number;
  color: string;
  duration: number;
  delay: number;
}

const Orb = ({ size, x, y, color, duration, delay }: OrbProps) => (
  <motion.div
    className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
    style={{ width: size, height: size, left: `${x}%`, top: `${y}%`, background: color }}
    animate={{
      x: [0, 40, -30, 20, 0],
      y: [0, -35, 25, -15, 0],
      scale: [1, 1.15, 0.9, 1.05, 1],
      opacity: [0.15, 0.25, 0.18, 0.22, 0.15],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// ── Tiny star particles ───────────────────────────────────────────────────────
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 4,
}));

// ── Canvas grid lines ─────────────────────────────────────────────────────────
const GridLines = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0d0d1a]">
      {/* Hard gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d1a] via-[#12103a] to-[#0d1a2e]" />

      {/* Grid overlay */}
      <GridLines />

      {/* Large ambient orbs */}
      <Orb size={600} x={-10} y={-15} color="#7c3aed" duration={18} delay={0} />
      <Orb size={500} x={60}  y={50}  color="#2563eb" duration={22} delay={3} />
      <Orb size={400} x={20}  y={65}  color="#0ea5e9" duration={20} delay={7} />
      <Orb size={350} x={75}  y={-10} color="#a855f7" duration={25} delay={1} />
      <Orb size={300} x={85}  y={75}  color="#6366f1" duration={16} delay={9} />

      {/* Star field */}
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%` }}
          animate={{ opacity: [0.1, 0.7, 0.1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
