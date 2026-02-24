import { TopBar } from "@/components/TopBar";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { ChatPanel } from "@/components/ChatPanel";
import { PlayerList } from "@/components/PlayerList";
import { WinnerModal } from "@/components/WinnerModal";
import { CorrectGuessOverlay } from "@/components/CorrectGuessOverlay";
import { useGameSocket } from "@/hooks/useGameSocket";

const Index = () => {
  // Mount centralized game socket listeners for all game events
  useGameSocket();

  return (
    <div className="h-screen w-screen flex flex-col p-2 gap-2 overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main Game Area */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* Canvas - 70% */}
        <div className="flex-[7] min-w-0">
          <DrawingCanvas />
        </div>

        {/* Chat - 30% */}
        <div className="flex-[3] min-w-0 hidden md:flex">
          <ChatPanel />
        </div>
      </div>

      {/* Bottom Panel */}
      <PlayerList />

      {/* Overlays */}
      <WinnerModal />
      <CorrectGuessOverlay />
    </div>
  );
};

export default Index;
