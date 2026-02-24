import { useGameStore } from "@/store/gameStore";
import { Crown, Pencil } from "lucide-react";

export const PlayerList = () => {
  const { players, currentDrawer, localPlayerId } = useGameStore();

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="game-card px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Players</h3>
        <span className="text-xs text-muted-foreground">{players.length} online</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((player, index) => {
          const isDrawerPlayer = player.id === currentDrawer;
          const isLocal = player.id === localPlayerId;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                isDrawerPlayer
                  ? "bg-primary/15 border border-primary/30 glow-primary"
                  : isLocal
                  ? "bg-accent/10 border border-accent/20"
                  : "bg-secondary/50 border border-transparent"
              }`}
            >
              {index === 0 && (
                <Crown className="w-3.5 h-3.5 text-warning shrink-0" />
              )}
              {isDrawerPlayer && (
                <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span
                className={`font-medium truncate ${
                  isLocal ? "text-accent" : "text-foreground"
                }`}
              >
                {player.username}
                {isLocal && " (You)"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {player.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
