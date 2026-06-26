import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const isAppArea = location.pathname.startsWith("/studio") || location.pathname.startsWith("/gallery");

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0B]/85 backdrop-blur-md"
    >
      <div className={`${isAppArea ? "px-4" : "max-w-7xl mx-auto px-6"} h-14 flex items-center justify-between`}>
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-7 h-7 grid place-items-center bg-[#FF4D4D] text-black">
            <Sparkles className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="font-display text-lg tracking-tight">KIEMA</span>
          <span className="label-eyebrow ml-2 hidden sm:inline">studio</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                to="/studio"
                data-testid="nav-studio"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname.startsWith("/studio")
                    ? "text-white bg-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Studio
              </Link>
              <Link
                to="/longform"
                data-testid="nav-longform"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname.startsWith("/longform")
                    ? "text-white bg-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Long-form
              </Link>
              <Link
                to="/gallery"
                data-testid="nav-gallery"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname.startsWith("/gallery")
                    ? "text-white bg-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Gallery
              </Link>
              <div className="mx-2 h-6 w-px bg-white/10" />
              <div className="flex items-center gap-2 px-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-white/10"
                  />
                ) : (
                  <div className="w-7 h-7 grid place-items-center rounded-full bg-zinc-800 text-xs">
                    {user.name?.[0] || "?"}
                  </div>
                )}
                <span className="hidden md:inline text-sm text-zinc-300">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                data-testid="nav-logout"
                className="ml-1 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <a href="#features" className="px-3 py-1.5 text-zinc-400 hover:text-white" data-testid="nav-features">
                Features
              </a>
              <a href="#how" className="px-3 py-1.5 text-zinc-400 hover:text-white" data-testid="nav-how">
                How it works
              </a>
              <a href="#pricing" className="px-3 py-1.5 text-zinc-400 hover:text-white" data-testid="nav-pricing">
                Pricing
              </a>
              <button
                onClick={handleLogin}
                data-testid="nav-signin"
                className="ml-2 px-4 py-1.5 btn-coral rounded-md text-sm"
              >
                Sign in
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
