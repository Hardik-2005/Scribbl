import { useGameStore, type ChatMessage } from "@/store/gameStore";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { socket } from "@/services/socket";

const MessageItem = ({ msg }: { msg: ChatMessage }) => {
  if (msg.type === "system") {
    return (
      <div className="text-xs text-muted-foreground italic text-center py-0.5 animate-float-in">
        {msg.message}
      </div>
    );
  }

  if (msg.type === "correct") {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-success/10 border border-success/20 animate-correct-pop">
        <span className="text-success font-semibold text-sm"> {msg.username}</span>
        <span className="text-success/80 text-xs">{msg.message}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 animate-float-in text-sm">
      <span className="font-semibold text-primary shrink-0">{msg.username}:</span>
      <span className="text-foreground/90 break-words">{msg.message}</span>
    </div>
  );
};

export const ChatPanel = () => {
  const { messages, localUsername, localPlayerId, currentDrawer, roomId, status } = useGameStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDrawer  = localPlayerId === currentDrawer;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !roomId) return;
    setInput("");

    // During active gameplay, non-drawers emit submit_guess so the backend
    // can check if the guess is correct. Correct guesses come back via
    // correct_guess event (handled by useGameSocket). Incorrect guesses are
    // rebroadcast as receive_message. Drawers and non-game states use send_message.
    if (status === "playing" && !isDrawer) {
      socket.emit("submit_guess", { roomId, guess: text });
    } else {
      socket.emit("send_message", { roomId, message: text });
    }
  };

  return (
    <div className="game-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Chat</h3>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin"
      >
        {messages.map((msg) => (
          <MessageItem key={msg.id} msg={msg} />
        ))}
      </div>

      {!isDrawer ? (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={status === "playing" ? "Type your guess..." : "Say something..."}
              className="flex-1 px-4 py-2.5 text-base rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-border">
          <p className="text-sm text-muted-foreground text-center italic">
            You're drawing! Chat is disabled.
          </p>
        </div>
      )}
    </div>
  );
};
