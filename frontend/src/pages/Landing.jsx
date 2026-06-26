import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, ImageIcon, Film, Wand2, Layers, MonitorPlay, Infinity as InfinityIcon, Sparkles, Cpu, Smartphone } from "lucide-react";
import Navbar from "@/components/Navbar";

const HERO_BG = "https://images.pexels.com/photos/30018094/pexels-photo-30018094.jpeg";
const SAMPLE_IMG = "https://images.pexels.com/photos/9007366/pexels-photo-9007366.jpeg";
const TEXTURE = "https://images.pexels.com/photos/29586670/pexels-photo-29586670.jpeg";

const startGoogle = () => {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const redirectUrl = window.location.origin + "/auth/callback";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const onPrimary = () => {
    if (user) navigate("/studio");
    else startGoogle();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/40 via-[#0A0A0B]/70 to-[#0A0A0B]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 grain">
          <div className="label-eyebrow mb-6" data-testid="hero-eyebrow">
            KIEMA · AI Creative Studio · 4K · Cross-platform
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.95] max-w-5xl">
            Turn imagination into
            <span className="block text-[#FF4D4D]">cinematic motion.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-zinc-300 text-base md:text-lg leading-relaxed">
            KIEMA is an AI-powered creative studio inspired by Adobe Firefly — generate ultra-high 4K images,
            animate stills into living scenes, and craft text-to-video stories. All on PC and mobile, completely free.
          </p>

          <div className="mt-10 flex flex-wrap gap-3 items-center">
            <button
              data-testid="hero-cta-primary"
              onClick={onPrimary}
              className="btn-coral px-6 py-3 rounded-md inline-flex items-center gap-2"
            >
              {user ? "Open Studio" : "Start creating — free"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#features"
              data-testid="hero-cta-secondary"
              className="px-6 py-3 rounded-md border border-white/15 hover:bg-white/5 transition-colors inline-flex items-center gap-2"
            >
              See features
            </a>
            <div className="ml-2 label-eyebrow hidden md:block">no subscription · no watermark</div>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
            {[
              { k: "4K", v: "Ultra-HD output" },
              { k: "30min", v: "Long-form video" },
              { k: "0$", v: "Forever free" },
              { k: "∞", v: "Generations" },
            ].map((s, i) => (
              <div key={i} className="bg-[#0A0A0B] px-6 py-6">
                <div className="font-display text-3xl md:text-4xl tracking-tight">{s.k}</div>
                <div className="label-eyebrow mt-2">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE BENTO */}
      <section id="features" className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="label-eyebrow mb-3" data-testid="features-eyebrow">02 · Tools</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tighter max-w-3xl">
            Every Firefly-grade tool. Re-engineered for everyone.
          </h2>

          <div className="mt-12 grid grid-cols-12 gap-4">
            {/* big card */}
            <div className="col-span-12 lg:col-span-8 border border-white/10 bg-[#0F0F11] relative overflow-hidden group">
              <img
                src={SAMPLE_IMG}
                alt=""
                className="w-full h-64 md:h-80 object-cover opacity-70 group-hover:opacity-90 transition-opacity"
              />
              <div className="p-8">
                <div className="flex items-center gap-2 label-eyebrow mb-3">
                  <ImageIcon className="w-3.5 h-3.5" /> Text-to-Image · 4K
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-tight">
                  Describe it. Render it. In stunning ultra-HD.
                </h3>
                <p className="mt-3 text-zinc-400 max-w-xl">
                  Powered by Gemini Nano Banana — describe any scene, style or composition. KIEMA generates
                  professional-grade visuals with sharp focus, depth, and cinematic lighting.
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 border border-white/10 bg-[#0F0F11] p-8 flex flex-col">
              <div className="flex items-center gap-2 label-eyebrow mb-3">
                <Film className="w-3.5 h-3.5" /> Image-to-Video
              </div>
              <h3 className="font-display text-2xl tracking-tight">Bring stills to life.</h3>
              <p className="mt-3 text-zinc-400 text-sm flex-1">
                Upload any image, describe the motion, and watch it animate into a living scene with
                Sora 2-grade cinematic motion.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-[#FF4D4D] text-sm">
                Open in Studio <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 border border-white/10 bg-[#0F0F11] p-8">
              <div className="flex items-center gap-2 label-eyebrow mb-3">
                <MonitorPlay className="w-3.5 h-3.5" /> Text-to-Video
              </div>
              <h3 className="font-display text-2xl tracking-tight">Cinema from a prompt.</h3>
              <p className="mt-3 text-zinc-400 text-sm">
                Type a scene, choose duration and aspect ratio. KIEMA renders dynamic, story-driven motion.
              </p>
            </div>

            <div className="col-span-12 lg:col-span-4 border border-white/10 bg-[#0F0F11] p-8">
              <div className="flex items-center gap-2 label-eyebrow mb-3">
                <Layers className="w-3.5 h-3.5" /> Motion Graphics
              </div>
              <h3 className="font-display text-2xl tracking-tight">Designed for storytellers.</h3>
              <p className="mt-3 text-zinc-400 text-sm">
                Compose layered scenes, motion presets and dynamic visuals — without timeline pain.
              </p>
            </div>

            <div className="col-span-12 lg:col-span-4 border border-white/10 bg-[#0F0F11] relative overflow-hidden">
              <img src={TEXTURE} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              <div className="relative p-8">
                <div className="flex items-center gap-2 label-eyebrow mb-3">
                  <Wand2 className="w-3.5 h-3.5" /> Style Engine
                </div>
                <h3 className="font-display text-2xl tracking-tight">15+ cinematic looks.</h3>
                <p className="mt-3 text-zinc-300/90 text-sm">
                  Photoreal, anime, claymation, noir, retro 80s — switch the visual language with one click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-5">
            <div className="label-eyebrow mb-3">03 · Workflow</div>
            <h2 className="font-display text-4xl md:text-5xl tracking-tighter">
              From idea to finished frame in three steps.
            </h2>
            <p className="mt-5 text-zinc-400 max-w-md">
              KIEMA strips away the timeline complexity of legacy NLEs. Describe, generate, refine.
              Your gallery saves every iteration.
            </p>
          </div>
          <div className="col-span-12 md:col-span-7 space-y-px bg-white/10 border border-white/10">
            {[
              { n: "01", t: "Describe", d: "Type a creative prompt or upload a reference image.", I: Sparkles },
              { n: "02", t: "Generate", d: "KIEMA renders 4K images or cinematic motion using Gemini & Sora 2.", I: Cpu },
              { n: "03", t: "Refine & Export", d: "Re-prompt, animate, or download instantly. No watermark.", I: MonitorPlay },
            ].map((s, i) => (
              <div key={i} className="bg-[#0A0A0B] p-6 flex items-start gap-6">
                <div className="label-eyebrow w-10 pt-1">{s.n}</div>
                <s.I className="w-5 h-5 text-[#FF4D4D] mt-0.5" />
                <div>
                  <div className="font-display text-xl">{s.t}</div>
                  <div className="text-sm text-zinc-400 mt-1 max-w-md">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-white/10 relative">
        <div className="absolute inset-0 radial-coral pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-24 relative">
          <div className="label-eyebrow mb-3">04 · Access</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tighter max-w-3xl">
            Built for everyone. Priced for nobody.
          </h2>

          <div className="mt-12 grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 border border-white/10 bg-[#0F0F11] p-10">
              <div className="flex items-center gap-2 label-eyebrow"><InfinityIcon className="w-3.5 h-3.5" /> All-inclusive</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-7xl tracking-tighter">$0</span>
                <span className="label-eyebrow">/ forever</span>
              </div>
              <ul className="mt-8 space-y-3 text-zinc-300">
                {[
                  "Unlimited 4K image generation",
                  "Text-to-Video & Image-to-Video",
                  "Up to 30 minutes of video output",
                  "Personal gallery & instant exports",
                  "No watermark · No premium tier",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-[#FF4D4D]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <button
                data-testid="pricing-cta"
                onClick={onPrimary}
                className="btn-coral mt-10 px-6 py-3 rounded-md inline-flex items-center gap-2"
              >
                {user ? "Open Studio" : "Sign in & start creating"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="col-span-12 lg:col-span-5 grid grid-rows-2 gap-4">
              <div className="border border-white/10 bg-[#0F0F11] p-8">
                <Smartphone className="w-5 h-5 text-[#FF4D4D]" />
                <div className="mt-4 font-display text-2xl">PC + Mobile native</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Designed responsive-first. Create on the train, edit in the studio.
                </div>
              </div>
              <div className="border border-white/10 bg-[#0F0F11] p-8">
                <Layers className="w-5 h-5 text-[#FF4D4D]" />
                <div className="mt-4 font-display text-2xl">Your gallery, your work</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Every generation auto-saves. Re-prompt, animate, or download anytime.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 grid place-items-center bg-[#FF4D4D] text-black">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-display tracking-tight">KIEMA</span>
            <span className="label-eyebrow">© 2026 — Empowering creators everywhere</span>
          </div>
          <div className="label-eyebrow">v1.0 · made with KIEMA</div>
        </div>
      </footer>
    </div>
  );
}
