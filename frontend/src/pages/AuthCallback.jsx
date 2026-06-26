import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/", { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(match[1]);

    (async () => {
      try {
        const user = await auth.exchange(sessionId);
        setUser(user);
        // remove fragment
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate("/studio", { replace: true, state: { user } });
      } catch (e) {
        setError("Sign-in failed. Please try again.");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] text-white">
      <div className="text-center">
        <div className="label-eyebrow mb-3">KIEMA · Authenticating</div>
        <div className="font-display text-3xl">{error || "Signing you in…"}</div>
      </div>
    </div>
  );
}
