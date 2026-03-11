import { motion } from "framer-motion";
import GoogleButton from "./GoogleButton";
import GuestLogin from "./GuestLogin";

interface LoginCardProps {
  onGoogleLogin: () => void;
  onGuestLogin: (username: string) => void;
}

const LoginCard = ({ onGoogleLogin, onGuestLogin }: LoginCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 28, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    whileHover={{ boxShadow: "0 24px 60px oklch(0.54 0.25 264 / 0.18)" }}
    className="
      w-full max-w-sm
      rounded-2xl
      bg-card/80 backdrop-blur-xl
      border border-blue-500/20
      p-8
      shadow-2xl shadow-blue-500/10
      transition-shadow duration-500
    "
  >
    {/* Header */}
    <div className="mb-8 text-center space-y-1.5">
      <h2 className="text-2xl font-black tracking-tight text-foreground">
        Enter{" "}
        <span className="text-primary drop-shadow-[0_0_12px_oklch(0.54_0.25_264/0.6)]">
          InkArena
        </span>
      </h2>
      <p className="text-sm text-muted-foreground">
        Jump in and start drawing
      </p>
    </div>

    {/* Google login */}
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Sign in
      </p>
      <GoogleButton onClick={onGoogleLogin} />
    </div>

    {/* Divider */}
    <div className="relative flex items-center gap-3 mb-6">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>

    {/* Guest login */}
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Play as guest
      </p>
      <GuestLogin onGuestLogin={onGuestLogin} />
    </div>

    {/* Footer */}
    <p className="mt-7 text-center text-xs text-muted-foreground/60">
      No account needed · Free to play · No ads
    </p>
  </motion.div>
);

export default LoginCard;
