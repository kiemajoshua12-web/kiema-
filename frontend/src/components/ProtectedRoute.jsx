import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] text-white">
        <div className="label-eyebrow">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}
