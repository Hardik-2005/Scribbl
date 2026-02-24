import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import ConnectionBadge from "./ConnectionBadge";
import type { RoomCreatedResponse, RoomJoinedResponse, ErrorResponse } from "@/types/socket";

// helpers
const LS_USERNAME = "inka_username";
const LS_ROOM_ID  = "inka_roomId";

const randomId = () =>
  Math.random().toString(36).substring(2, 6).toUpperCase() +
  "-" +
  Math.random().toString(36).substring(2, 6).toUpperCase();

// Neon input
interface NeonInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  mono?: boolean;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const NeonInput = ({ label, value, onChange, placeholder, maxLength, mono, icon, action }: NeonInputProps) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
      {label}
    </label>
    <div className="relative group">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-purple-400 transition-colors pointer-events-none">
          {icon}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
        className={`
          w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10
          text-white placeholder-white/20 outline-none
          transition-all duration-200
          focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/8
          group-hover:border-white/20
          ${icon ? "pl-10" : ""}
          ${action ? "pr-24" : ""}
          ${mono ? "font-mono tracking-[0.2em]" : ""}
        `}
      />
      {action && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">{action}</div>
      )}
    </div>
  </div>
);

// Neon button
interface NeonButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}

const NeonButton = ({ onClick, disabled, loading, children, variant = "primary" }: NeonButtonProps) => {
  const base =
    "relative flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 overflow-hidden";

  const styles = {
    primary:
      "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.55)] hover:from-violet-500 hover:to-purple-500",
    secondary:
      "bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:border-white/25 hover:text-white",
    ghost:
      "border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/50 hover:shadow-[0_0_18px_rgba(6,182,212,0.2)]",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]}`}
    >
      {loading ? <Spinner /> : children}
    </motion.button>
  );
};

// Spinner
const Spinner = () => (
  <motion.svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    animate={{ rotate: 360 }}
    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </motion.svg>
);

// LobbyPanel
interface LobbyPanelProps {
  connected: boolean;
  connecting: boolean;
}

const LobbyPanel = ({ connected, connecting }: LobbyPanelProps) => {
  const navigate = useNavigate();
  const { setLocalPlayer, setRoomId: storeSetRoomId } = useGameStore();

  const [username, setUsername] = useState(() => localStorage.getItem(LS_USERNAME) ?? "");
  const [roomId,   setRoomId]   = useState(() => localStorage.getItem(LS_ROOM_ID)  ?? "");
  const [loading,  setLoading]  = useState<"create" | "join" | "quick" | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const status = connecting ? "connecting" : connected ? "connected" : "disconnected";

  const persist = (un: string, rid: string) => {
    localStorage.setItem(LS_USERNAME, un);
    localStorage.setItem(LS_ROOM_ID, rid);
  };

  const validate = (requireRoom = true): boolean => {
    if (!username.trim()) { setError("Username is required."); return false; }
    if (requireRoom && !roomId.trim()) { setError("Room ID is required."); return false; }
    setError(null);
    return true;
  };

  // Join existing room
  const doJoin = useCallback(
    (rid: string, un: string) => {
      socket.emit("join_room", { roomId: rid, username: un }, (res: RoomJoinedResponse | ErrorResponse) => {
        setLoading(null);
        if (!res.success) { setError((res as ErrorResponse).error); return; }
        const ok = res as RoomJoinedResponse;
        storeSetRoomId(ok.roomId);
        setLocalPlayer(ok.userId, ok.username);
        persist(ok.username, ok.roomId);
        navigate("/game");
      });
    },
    [navigate, setLocalPlayer, storeSetRoomId]
  );

  // Create room (auto-joins via backend when username is supplied)
  const handleCreate = () => {
    if (!validate(false)) return;
    if (!connected) { setError("Not connected — please wait."); return; }
    const rid = roomId.trim() || randomId();
    setRoomId(rid);
    setLoading("create");
    socket.emit(
      "create_room",
      { roomId: rid, username: username.trim() },
      (res: RoomCreatedResponse | ErrorResponse) => {
        setLoading(null);
        if (!res.success) { setError((res as ErrorResponse).error); return; }
        const ok = res as RoomCreatedResponse;
        storeSetRoomId(ok.roomId);
        // If backend auto-joined (userId present), use it; otherwise do a manual join
        if (ok.userId) {
          setLocalPlayer(ok.userId, username.trim());
          persist(username.trim(), ok.roomId);
          navigate("/game");
        } else {
          // Manually join after room creation
          setLoading("create");
          doJoin(ok.roomId, username.trim());
        }
      }
    );
  };

  const handleJoin = () => {
    if (!validate(true)) return;
    if (!connected) { setError("Not connected — please wait."); return; }
    setLoading("join");
    doJoin(roomId.trim(), username.trim());
  };

  const handleQuickJoin = () => {
    if (!username.trim()) { setError("Username is required."); return; }
    if (!connected)       { setError("Not connected — please wait."); return; }
    const rid = randomId();
    setRoomId(rid);
    setLoading("quick");
    socket.emit(
      "create_room",
      { roomId: rid, username: username.trim() },
      (res: RoomCreatedResponse | ErrorResponse) => {
        setLoading(null);
        if (!res.success) { setError((res as ErrorResponse).error); return; }
        const ok = res as RoomCreatedResponse;
        storeSetRoomId(ok.roomId);
        if (ok.userId) {
          setLocalPlayer(ok.userId, username.trim());
          persist(username.trim(), ok.roomId);
          navigate("/game");
        } else {
          setLoading("quick");
          doJoin(ok.roomId, username.trim());
        }
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      className="relative w-full max-w-[420px] rounded-2xl
                 border border-white/10
                 bg-white/[0.04] backdrop-blur-2xl
                 shadow-[0_0_60px_rgba(139,92,246,0.12),inset_0_0_0_1px_rgba(255,255,255,0.07)]
                 p-8 space-y-6"
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent rounded-full" />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Enter the Arena</h2>
          <ConnectionBadge status={status} />
        </div>
        <p className="text-xs text-white/35">
          Create a private room or join with a friend's Room ID.
        </p>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <NeonInput
          label="Username"
          value={username}
          onChange={(v) => { setUsername(v); setError(null); }}
          placeholder="e.g. PixelNinja"
          maxLength={24}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <NeonInput
          label="Room ID"
          value={roomId}
          onChange={(v) => { setRoomId(v.toUpperCase()); setError(null); }}
          placeholder="e.g. ABCD-EFGH"
          maxLength={20}
          mono
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          }
          action={
            <button
              onClick={() => { setRoomId(randomId()); setError(null); }}
              title="Generate random ID"
              className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35
                         border border-purple-500/25 text-purple-300 text-[10px] font-semibold
                         tracking-wide transition-all hover:text-white"
            >
              RNG
            </button>
          }
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl
                       bg-red-500/10 border border-red-500/25 text-red-300 text-xs"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary actions */}
      <div className="space-y-3">
        <NeonButton
          variant="primary"
          onClick={handleCreate}
          disabled={loading !== null || !connected}
          loading={loading === "create"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Room
        </NeonButton>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-white/25 text-[11px] font-semibold tracking-widest">OR</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        <NeonButton
          variant="secondary"
          onClick={handleJoin}
          disabled={loading !== null || !connected}
          loading={loading === "join"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          Join Room
        </NeonButton>
      </div>

      {/* Quick join divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-white/20 text-[10px] uppercase tracking-widest">Quick Play</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <NeonButton
        variant="ghost"
        onClick={handleQuickJoin}
        disabled={loading !== null || !connected}
        loading={loading === "quick"}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Quick Join Public Room
      </NeonButton>

      {/* Footer */}
      <p className="text-center text-white/20 text-[11px]">
        Share your Room ID with friends to play together.
      </p>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent rounded-full" />
    </motion.div>
  );
};

export default LobbyPanel;
