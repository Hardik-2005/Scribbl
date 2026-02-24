import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { connectSocket, socket } from "@/services/socket";
import AnimatedBackground from "@/components/lobby/AnimatedBackground";
import LobbyPanel from "@/components/lobby/LobbyPanel";

//  Floating canvas illustration (SVG) 
const CanvasIllustration = () => (
  <motion.div
    animate={{ y: [0, -12, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    className="w-full max-w-[340px] mx-auto select-none pointer-events-none"
  >
    <svg viewBox="0 0 340 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
      {/* Canvas frame */}
      <rect x="20" y="20" width="300" height="200" rx="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* Toolbar accent */}
      <rect x="20" y="20" width="300" height="36" rx="16" fill="rgba(139,92,246,0.15)" />
      <rect x="20" y="44" width="300" height="12" fill="rgba(139,92,246,0.08)" />
      {/* Tool dots */}
      <circle cx="44" cy="38" r="7" fill="rgba(139,92,246,0.5)" />
      <circle cx="66" cy="38" r="7" fill="rgba(99,102,241,0.4)" />
      <circle cx="88" cy="38" r="7" fill="rgba(6,182,212,0.35)" />
      {/* Brush strokes */}
      <path d="M 60 100 Q 110 70 160 110 Q 210 150 270 90" stroke="rgba(167,139,250,0.7)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M 50 150 Q 120 130 180 155 Q 230 175 280 140" stroke="rgba(6,182,212,0.55)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Guess bubbles */}
      <rect x="28" y="172" width="90" height="22" rx="11" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <rect x="126" y="172" width="70" height="22" rx="11" fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
      <rect x="204" y="172" width="108" height="22" rx="11" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* Glow on stroke */}
      <path d="M 60 100 Q 110 70 160 110 Q 210 150 270 90" stroke="rgba(167,139,250,0.15)" strokeWidth="14" strokeLinecap="round" fill="none" />
    </svg>
  </motion.div>
);

//  Feature bullet 
interface FeatureProps {
  icon: React.ReactNode;
  text: string;
  delay: number;
}

const Feature = ({ icon, text, delay }: FeatureProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay }}
    className="flex items-center gap-3 text-white/50 text-sm"
  >
    <span className="text-purple-400/80">{icon}</span>
    {text}
  </motion.div>
);

//  Main lobby page 
const Lobby = () => {
  const [connected,  setConnected]  = useState(socket.connected);
  const [connecting, setConnecting] = useState(!socket.connected);

  useEffect(() => {
    connectSocket();
    setConnecting(true);

    const onConnect    = () => { setConnected(true);  setConnecting(false); };
    const onDisconnect = () => { setConnected(false); setConnecting(false); };
    const onConnectErr = () => { setConnected(false); setConnecting(false); };

    socket.on("connect",       onConnect);
    socket.on("disconnect",    onDisconnect);
    socket.on("connect_error", onConnectErr);

    if (socket.connected) { setConnected(true); setConnecting(false); }

    return () => {
      socket.off("connect",       onConnect);
      socket.off("disconnect",    onDisconnect);
      socket.off("connect_error", onConnectErr);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden flex">
      {/* Animated full-screen background */}
      <AnimatedBackground />

      {/* Left section */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center items-start
                      w-1/2 xl:w-[55%] px-16 xl:px-24 gap-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="flex items-end gap-1">
            <h1 className="text-7xl xl:text-8xl font-black tracking-tighter text-white leading-none">
              Ink
            </h1>
            <h1 className="text-7xl xl:text-8xl font-black tracking-tighter leading-none
                           bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Arena
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-xl text-white/40 font-medium tracking-[0.15em] uppercase"
          >
            Draw  Guess  Dominate
          </motion.p>
        </motion.div>

        {/* Canvas illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full"
        >
          <CanvasIllustration />
        </motion.div>

        {/* Feature bullets */}
        <div className="space-y-4">
          <Feature
            delay={0.55}
            text="Real-time multiplayer drawing"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <Feature
            delay={0.65}
            text="Live scoring and leaderboard"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <Feature
            delay={0.75}
            text="Competitive timed rounds"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Right section */}
      <div className="relative z-10 flex flex-col justify-center items-center
                      w-full lg:w-1/2 xl:w-[45%] px-6 lg:px-12 xl:px-16">

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center lg:hidden"
        >
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Ink<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Arena</span>
          </h1>
          <p className="text-sm text-white/40 mt-1 tracking-widest uppercase">Draw  Guess  Dominate</p>
        </motion.div>

        <LobbyPanel connected={connected} connecting={connecting} />
      </div>
    </div>
  );
};

export default Lobby;
