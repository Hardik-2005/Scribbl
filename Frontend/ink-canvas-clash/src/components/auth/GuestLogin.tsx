import { useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";

interface GuestLoginProps {
  onGuestLogin: (username: string) => void;
}

const GuestLogin = ({ onGuestLogin }: GuestLoginProps) => {
  const [username, setUsername] = useState("");

  const isValid = username.trim().length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) return;
    onGuestLogin(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {/* Username input */}
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
          <User className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          aria-label="Username"
          className="
            w-full rounded-xl px-4 py-3.5 pl-10 text-base
            bg-secondary border border-border
            text-foreground placeholder:text-muted-foreground outline-none
            transition-all duration-200
            focus:border-primary/60 focus:ring-2 focus:ring-primary/20
            hover:border-border/80
          "
        />
      </div>

      {/* Play as Guest button */}
      <motion.button
        type="submit"
        disabled={!isValid}
        whileHover={
          isValid
            ? {
                scale: 1.02,
                boxShadow: "0 0 28px oklch(0.54 0.25 264 / 0.4)",
              }
            : {}
        }
        whileTap={isValid ? { scale: 0.98 } : {}}
        className="
          relative flex items-center justify-center gap-2.5 group
          w-full h-12 rounded-xl
          font-semibold text-base tracking-wide
          transition-all duration-200
          bg-gradient-to-r from-primary to-blue-400
          text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          overflow-hidden
        "
      >
        {/* Shimmer sweep */}
        <span
          aria-hidden="true"
          className="
            absolute inset-0 -skew-x-12 -translate-x-full
            group-hover:translate-x-[220%]
            transition-transform duration-700
            bg-gradient-to-r from-transparent via-white/15 to-transparent
            pointer-events-none
          "
        />
        Play as Guest
      </motion.button>
    </form>
  );
};

export default GuestLogin;
