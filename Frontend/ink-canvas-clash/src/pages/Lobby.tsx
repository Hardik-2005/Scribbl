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
    <svg viewBox="0 0 340 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Canvas frame */}
      <rect x="20" y="20" width="300" height="200" rx="12" fill="oklch(0.185 0.02 260)" stroke="oklch(0.28 0.015 260)" strokeWidth="1.5" />
      {/* Toolbar accent */}
      <rect x="20" y="20" width="300" height="36" rx="12" fill="oklch(0.22 0.018 260)" />
      {/* Tool dots */}
      <circle cx="44" cy="38" r="6" fill="oklch(0.54 0.25 264 / 0.6)" />
      <circle cx="64" cy="38" r="6" fill="oklch(0.54 0.25 264 / 0.4)" />
      <circle cx="84" cy="38" r="6" fill="oklch(0.54 0.25 264 / 0.25)" />
      {/* Brush strokes */}
      <path d="M 60 100 Q 110 70 160 110 Q 210 150 270 90" stroke="oklch(0.54 0.25 264 / 0.6)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M 50 150 Q 120 130 180 155 Q 230 175 280 140" stroke="oklch(0.62 0.19 260 / 0.5)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Guess bubbles */}
      <rect x="28" y="172" width="90" height="22" rx="11" fill="oklch(0.22 0.018 260)" stroke="oklch(0.28 0.015 260)" strokeWidth="1" />
      <rect x="126" y="172" width="70" height="22" rx="11" fill="oklch(0.54 0.25 264 / 0.15)" stroke="oklch(0.54 0.25 264 / 0.3)" strokeWidth="1" />
      <rect x="204" y="172" width="108" height="22" rx="11" fill="oklch(0.22 0.018 260)" stroke="oklch(0.28 0.015 260)" strokeWidth="1" />
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
    className="flex items-center gap-3 text-muted-foreground text-base"
  >
    <span className="text-primary">{icon}</span>
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
                      w-1/2 xl:w-[55%] px-16 xl:px-24 gap-12">

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
            <h1 className="text-7xl xl:text-8xl font-black tracking-tighter leading-none text-primary">
              Arena
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-xl text-muted-foreground font-medium tracking-[0.15em] uppercase"
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
        <div className="space-y-5">
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
          <h1 className="text-6xl font-black tracking-tighter text-white">
            Ink<span className="text-primary">Arena</span>
          </h1>
          <p className="text-base text-muted-foreground mt-2 tracking-widest uppercase">Draw  Guess  Dominate</p>
        </motion.div>

        <LobbyPanel connected={connected} connecting={connecting} />
      </div>
    </div>
  );
};

export default Lobby;
