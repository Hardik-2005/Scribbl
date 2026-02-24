import { useGameStore } from "@/store/gameStore";
import { LogOut, Pencil } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";

export const TopBar = () => {
  const { roomId, currentRound, totalRounds, players, currentDrawer, word, wordHint, localPlayerId } =
    useGameStore();

  const isDrawer = localPlayerId === currentDrawer;
  const drawerName = players.find((p) => p.id === currentDrawer)?.username ?? "Unknown";

  return (
    <header className="game-card flex items-center justify-between px-4 py-2.5 gap-4">
      {/* Left: Room & Round */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground tracking-wider">ROOM</span>
          <span className="text-sm font-mono font-semibold text-primary neon-text">
            {roomId}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Round</span>
          <span className="font-bold text-foreground">
            {currentRound}/{totalRounds}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
          <Pencil className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground">{drawerName}</span>
          <span>is drawing</span>
        </div>
      </div>

      {/* Center: Word / Hint & Timer */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          {isDrawer ? (
            <div className="px-4 py-1 rounded-lg bg-primary/10 border border-primary/30">
              <span className="font-mono font-bold text-primary tracking-widest text-lg neon-text">
                {word}
              </span>
            </div>
          ) : (
            <div className="px-4 py-1 rounded-lg bg-secondary">
              <span className="font-mono font-bold text-foreground tracking-[0.3em] text-lg">
                {wordHint}
              </span>
            </div>
          )}
        </div>
        <CountdownTimer />
      </div>

      {/* Right: Exit */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </header>
  );
};
