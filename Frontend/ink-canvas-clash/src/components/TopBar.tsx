import { useGameStore } from "@/store/gameStore";
import { LogOut, Pencil, Users } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";
import { useNavigate } from "react-router-dom";
import { socket } from "@/services/socket";

export const TopBar = () => {
  const {
    roomId,
    currentRound,
    totalRounds,
    players,
    currentDrawer,
    word,
    wordHint,
    localPlayerId,
    status,
    selectedRounds,
    setSelectedRounds,
    hostId,
  } = useGameStore();

  const navigate = useNavigate();
  const isDrawer     = localPlayerId === currentDrawer;
  const drawerPlayer = players.find((p) => p.id === currentDrawer);
  const isHost       = hostId !== "" && hostId === localPlayerId;

  const handleStartGame = () => {
    if (!roomId) return;
    socket.emit("start_game", { roomId, totalRounds: selectedRounds });
  };

  const handleExit = () => navigate("/lobby");

  /*  Lobby / Waiting Room  */
  if (status === "lobby") {
    return (
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-card/80 backdrop-blur-sm gap-4 min-h-[56px]">
        {/* Room + player count */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono hidden sm:block">
            Room
          </span>
          <span className="text-sm font-mono font-bold text-primary truncate max-w-[120px] neon-text">
            {roomId || "—"}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3" />
            <span>{players.length}</span>
          </div>
        </div>

        {/* Host controls or waiting message */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          {isHost ? (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground hidden sm:block">Rounds</label>
              <select
                value={selectedRounds}
                onChange={(e) => setSelectedRounds(Number(e.target.value))}
                className="h-8 px-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "round" : "rounds"}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                title={players.length < 2 ? "Need at least 2 players" : "Start the game"}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold
                           hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all
                           shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_28px_rgba(139,92,246,0.55)]"
              >
                 Start Game
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border/50 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Waiting for host to start
            </div>
          )}
        </div>

        {/* Exit */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </header>
    );
  }

  /*  Playing / Round-end  */
  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-card/80 backdrop-blur-sm gap-3 min-h-[56px]">
      {/* Left: Room + Round + Drawer */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono font-bold text-primary text-sm hidden sm:block truncate max-w-[100px]">
          {roomId}
        </span>
        <div className="flex items-center gap-1 text-sm shrink-0">
          <span className="text-muted-foreground hidden sm:inline">Round</span>
          <span className="font-bold text-foreground">{currentRound}</span>
          <span className="text-muted-foreground">/{totalRounds}</span>
        </div>
        {drawerPlayer && (
          <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {drawerPlayer.username}
            </span>
            <span className="hidden lg:inline">is drawing</span>
          </div>
        )}
      </div>

      {/* Center: Word display */}
      <div className="flex-1 flex justify-center">
        {status === "round_end" ? (
          <div className="px-4 py-1 rounded-lg bg-secondary border border-border">
            <span className="font-mono font-bold text-foreground tracking-widest text-base">
              {word}
            </span>
          </div>
        ) : isDrawer ? (
          <div className="px-4 py-1 rounded-lg bg-primary/10 border border-primary/30">
            <span className="font-mono font-bold text-primary tracking-widest text-base neon-text">
              {word}
            </span>
          </div>
        ) : (
          <div className="px-4 py-1 rounded-lg bg-secondary border border-border">
            <span className="font-mono font-bold text-foreground tracking-[0.3em] text-base">
              {wordHint || "_ _ _"}
            </span>
          </div>
        )}
      </div>

      {/* Right: Timer + Exit */}
      <div className="flex items-center gap-3 shrink-0">
        <CountdownTimer />
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    </header>
  );
};
