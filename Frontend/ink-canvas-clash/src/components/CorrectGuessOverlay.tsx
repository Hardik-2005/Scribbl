import { useGameStore } from "@/store/gameStore";

export const CorrectGuessOverlay = () => {
  const { showCorrectAnimation, setShowCorrectAnimation } = useGameStore();

  if (!showCorrectAnimation) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      onAnimationEnd={() => setShowCorrectAnimation(false)}
    >
      <div className="animate-correct-pop text-4xl font-bold text-success neon-text">
        🎉 Correct!
      </div>
    </div>
  );
};
