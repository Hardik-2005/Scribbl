import { useGameStore } from "@/store/gameStore";
import { Trophy, X } from "lucide-react";

export const WinnerModal = () => {
  const { status, players, setStatus } = useGameStore();

  if (status !== "game_end") return null;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 animate-float-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 text-center animate-correct-pop shadow-[0_4px_24px_oklch(0_0_0/0.6)]">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setStatus("lobby")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-warning" />
          </div>
        </div>

        <h2 className="text-4xl font-bold text-foreground mb-2">Game Over!</h2>
        <p className="text-base text-muted-foreground mb-8">
          <span className="text-primary font-semibold">{winner?.username}</span> wins!
        </p>

        <div className="space-y-2 mb-8">
          {sorted.slice(0, 5).map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                i === 0
                  ? "bg-warning/10 border border-warning/30"
                  : "bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-base text-muted-foreground w-6">
                  #{i + 1}
                </span>
                <span className="font-medium text-base text-foreground">{player.username}</span>
              </div>
              <span className="font-mono font-bold text-base text-primary">{player.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStatus("lobby")}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};
