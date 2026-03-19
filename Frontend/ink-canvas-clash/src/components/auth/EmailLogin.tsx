import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithEmail, saveAuth } from "@/services/auth";

type Mode = "signin" | "signup";

const EmailLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === "signup"
          ? await registerWithEmail(username.trim(), email.trim(), password)
          : await loginWithEmail(email.trim(), password);
      saveAuth(result);
      navigate("/lobby");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border bg-secondary/50 p-1 gap-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`
              flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
              ${mode === m
                ? "bg-primary text-white shadow"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {m === "signin" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <AnimatePresence mode="popLayout">
          {/* Username — Sign Up only */}
          {mode === "signup" && (
            <motion.div
              key="username"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="relative group overflow-hidden"
            >
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                maxLength={20}
                autoComplete="username"
                disabled={loading}
                className="
                  w-full rounded-xl px-4 py-3 pl-10 text-sm
                  bg-secondary border border-border
                  text-foreground placeholder:text-muted-foreground outline-none
                  transition-all duration-200
                  focus:border-primary/60 focus:ring-2 focus:ring-primary/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email */}
        <div className="relative group">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
            <Mail className="w-4 h-4" />
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            disabled={loading}
            className="
              w-full rounded-xl px-4 py-3 pl-10 text-sm
              bg-secondary border border-border
              text-foreground placeholder:text-muted-foreground outline-none
              transition-all duration-200
              focus:border-primary/60 focus:ring-2 focus:ring-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>

        {/* Password */}
        <div className="relative group">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
            <Lock className="w-4 h-4" />
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Password (min 6 chars)" : "Password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            disabled={loading}
            className="
              w-full rounded-xl px-4 py-3 pl-10 text-sm
              bg-secondary border border-border
              text-foreground placeholder:text-muted-foreground outline-none
              transition-all duration-200
              focus:border-primary/60 focus:ring-2 focus:ring-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400 text-center px-1"
          >
            {error}
          </motion.p>
        )}

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 28px oklch(0.54 0.25 264 / 0.4)" } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          className="
            relative flex items-center justify-center gap-2.5 group
            w-full h-12 rounded-xl
            font-semibold text-sm tracking-wide
            transition-all duration-200
            bg-gradient-to-r from-primary to-blue-400
            text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            overflow-hidden
          "
        >
          {/* Shimmer */}
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
          {loading
            ? (mode === "signup" ? "Creating account…" : "Signing in…")
            : (mode === "signup" ? "Create Account" : "Sign In")}
        </motion.button>
      </form>
    </div>
  );
};

export default EmailLogin;
