import { useState } from "react";
import { Users, MessageSquare, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { ChatPanel } from "@/components/ChatPanel";
import { PlayerList } from "@/components/PlayerList";
import { WinnerModal } from "@/components/WinnerModal";
import { CorrectGuessOverlay } from "@/components/CorrectGuessOverlay";
import { WordSelectionModal } from "@/components/WordSelectionModal";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useGameStore } from "@/store/gameStore";

const Index = () => {
  useGameSocket();
  const [chatOpen, setChatOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const { players } = useGameStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      {/*  Top Control Bar  */}
      <TopBar />

      {/*  Main Content  */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left sidebar: desktop only */}
        <aside className="hidden lg:flex flex-col w-52 xl:w-60 shrink-0 border-r border-white/[0.06] overflow-hidden">
          <PlayerList />
        </aside>

        {/* Center: canvas */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col p-2 gap-2 overflow-hidden">
          <div className="flex-1 min-h-0 relative">
            <DrawingCanvas />
          </div>

          {/* Mobile inline chat */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              chatOpen ? "h-52" : "h-0"
            }`}
          >
            <ChatPanel />
          </div>
        </main>

        {/* Right sidebar: desktop only */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-l border-white/[0.06] overflow-hidden">
          <ChatPanel />
        </aside>
      </div>

      {/*  Mobile Bottom Toolbar  */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-card/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{players.length} online</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlayersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground"
          >
            <Users className="w-3.5 h-3.5" />
            Players
          </button>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              chatOpen
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-secondary border-border text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
        </div>
      </div>

      {/*  Mobile Players Bottom Sheet  */}
      {playersOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setPlayersOpen(false)}
        >
          <div
            className="w-full bg-card rounded-t-2xl border-t border-white/10 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-foreground">Players</h3>
              <button
                onClick={() => setPlayersOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 pb-6">
              <PlayerList />
            </div>
          </div>
        </div>
      )}

      {/*  Overlays  */}
      <WordSelectionModal />
      <WinnerModal />
      <CorrectGuessOverlay />
    </div>
  );
};

export default Index;
