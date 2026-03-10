import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { socket } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";

export const GuessInput = () => {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const currentDrawer = useGameStore((s) => s.currentDrawer);
  const roomId = useGameStore((s) => s.roomId);
  const status = useGameStore((s) => s.status);

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isDrawer = localPlayerId === currentDrawer;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !roomId) return;
    setInput("");

    if (status === "playing" && !isDrawer) {
      socket.emit("submit_guess", { roomId, guess: text });
    } else {
      socket.emit("send_message", { roomId, message: text });
    }
  }, [input, roomId, status, isDrawer]);

  if (isDrawer) {
    return (
      <div className="px-3 py-2 border-t border-border bg-card shrink-0" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <p className="text-xs text-muted-foreground text-center italic">
          You're drawing — chat disabled
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 border-t border-border bg-card shrink-0" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={status === "playing" ? "Type your guess…" : "Say something…"}
          enterKeyHint="send"
          autoComplete="off"
          className="flex-1 min-w-0 px-3 py-2.5 text-base rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          className="px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
