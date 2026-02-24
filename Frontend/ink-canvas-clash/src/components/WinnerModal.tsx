import { useGameStore } from "@/store/gameStore";
import { Trophy, X } from "lucide-react";

export const WinnerModal = () => {
  const { status, players, setStatus } = useGameStore();

  if (status !== "game_end") return null;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-float-in">
      <div className="game-card p-8 max-w-sm w-full mx-4 text-center animate-correct-pop">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setStatus("lobby")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center glow-primary">
            <Trophy className="w-8 h-8 text-warning" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1">Game Over!</h2>
        <p className="text-muted-foreground mb-6">
          <span className="text-primary font-semibold neon-text">{winner?.username}</span> wins!
        </p>

        <div className="space-y-2 mb-6">
          {sorted.slice(0, 5).map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                i === 0
                  ? "bg-warning/10 border border-warning/30"
                  : "bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground w-5">
                  #{i + 1}
                </span>
                <span className="font-medium text-foreground">{player.username}</span>
              </div>
              <span className="font-mono font-bold text-primary">{player.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStatus("lobby")}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};
