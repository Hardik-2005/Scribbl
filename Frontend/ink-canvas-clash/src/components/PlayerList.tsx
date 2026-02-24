import { useGameStore } from "@/store/gameStore";
import { Crown, Pencil } from "lucide-react";

export const PlayerList = () => {
  const { players, currentDrawer, localPlayerId } = useGameStore();
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Players</h3>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {players.length}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {sorted.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground pt-8 px-4">
            No players yet
          </p>
        ) : (
          <div className="p-2 space-y-1">
            {sorted.map((player, index) => {
              const isDrawing = player.id === currentDrawer;
              const isLocal   = player.id === localPlayerId;
              const isLeader  = index === 0 && player.score > 0;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isDrawing
                      ? "bg-primary/15 border border-primary/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                      : isLocal
                      ? "bg-accent/10 border border-accent/20"
                      : "bg-white/[0.03] border border-transparent hover:bg-white/[0.05]"
                  }`}
                >
                  {/* Rank */}
                  <span className="text-[11px] font-mono text-muted-foreground w-4 text-center shrink-0">
                    {index + 1}
                  </span>

                  {/* Icon */}
                  <span className="shrink-0 w-3.5 flex items-center justify-center">
                    {isLeader ? (
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    ) : isDrawing ? (
                      <Pencil className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                    )}
                  </span>

                  {/* Name */}
                  <span
                    className={`font-medium truncate flex-1 text-sm ${
                      isLocal ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {player.username}
                    {isLocal && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">
                        (you)
                      </span>
                    )}
                  </span>

                  {/* Score */}
                  <span className="font-mono text-xs text-muted-foreground shrink-0 tabular-nums">
                    {player.score}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
