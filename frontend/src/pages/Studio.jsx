import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { generations as genApi, videoUrl } from "@/lib/apiClient";
import { Image as ImageIcon, Film, Wand2, Download, Loader2, Sparkles, AlertCircle, Upload, X } from "lucide-react";
import { toast, Toaster } from "sonner";

const STYLES = [
  "cinematic", "photoreal", "anime", "noir", "claymation",
  "retro 80s", "watercolor", "3D render", "concept art", "vaporwave",
];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "21:9"];
const VIDEO_SIZES = [
  { label: "Landscape · 1280x720", value: "1280x720" },
  { label: "Cinema · 1792x1024", value: "1792x1024" },
  { label: "Portrait · 1024x1792", value: "1024x1792" },
  { label: "Square · 1024x1024", value: "1024x1024" },
];
const DURATIONS = [4, 8, 12];

const TABS = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "animate", label: "Animate", icon: Wand2 },
  { id: "video", label: "Video", icon: Film },
];

export default function Studio() {
  const [tab, setTab] = useState("image");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [aspect, setAspect] = useState("16:9");
  const [videoSize, setVideoSize] = useState("1280x720");
  const [duration, setDuration] = useState(4);
  const [refImage, setRefImage] = useState(null); // {dataUrl, b64}
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);

  const loadRecent = useCallback(async () => {
    try {
      const r = await genApi.list();
      setRecent(r.items || []);
    } catch {}
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const b64 = String(dataUrl).split(",")[1] || "";
      setRefImage({ dataUrl, b64 });
    };
    reader.readAsDataURL(f);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you'd like to create.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      if (tab === "image") {
        const out = await genApi.image({
          prompt,
          style,
          aspect_ratio: aspect,
          reference_image_b64: refImage?.b64,
        });
        setResult({ kind: "image", data: out });
        toast.success("Image rendered");
      } else if (tab === "animate") {
        // Image-to-video: enrich prompt with the user's reference description
        const enriched = refImage
          ? `${prompt}. Cinematic motion of the uploaded reference scene, smooth camera move, 4K detail.`
          : `${prompt}. Cinematic camera motion, 4K detail.`;
        const out = await genApi.video({
          prompt: enriched,
          size: videoSize,
          duration,
          model: "sora-2",
        });
        setResult({ kind: "video", data: out });
        toast.success("Animation complete");
      } else {
        const out = await genApi.video({
          prompt,
          size: videoSize,
          duration,
          model: "sora-2",
        });
        setResult({ kind: "video", data: out });
        toast.success("Video rendered");
      }
      loadRecent();
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Generation failed";
      toast.error(String(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col">
      <Toaster theme="dark" position="bottom-right" />
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* LEFT SIDEBAR - tools */}
        <aside
          data-testid="studio-sidebar"
          className="lg:w-72 border-r border-white/10 bg-[#0E0E10] flex lg:flex-col"
        >
          <div className="hidden lg:block p-5">
            <div className="label-eyebrow">Tools</div>
          </div>
          <div className="flex lg:flex-col w-full">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                data-testid={`tool-${id}`}
                onClick={() => { setTab(id); setResult(null); }}
                className={`flex-1 lg:flex-none flex items-center gap-3 px-5 py-4 border-b border-white/5 text-left transition-colors ${
                  tab === id
                    ? "bg-[#141416] text-white border-l-2 border-l-[#FF4D4D]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="label-eyebrow hidden lg:block">
                    {id === "image" ? "text → 4K still" : id === "animate" ? "still → motion" : "text → motion"}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden lg:block mt-auto p-5 border-t border-white/10 space-y-3">
            <Link
              to="/longform"
              data-testid="sidebar-longform-link"
              className="block border border-[#FF4D4D]/40 bg-[#FF4D4D]/5 hover:bg-[#FF4D4D]/10 p-3 transition-colors"
            >
              <div className="label-eyebrow text-[#FF4D4D]">New · up to 30 min</div>
              <div className="text-sm font-medium mt-1">Long-form video →</div>
              <div className="text-xs text-zinc-400 mt-0.5">Stitched cinematic stories</div>
            </Link>
            <div>
              <div className="label-eyebrow mb-1">Engine</div>
              <div className="text-sm text-zinc-300">Gemini Nano Banana · Sora 2</div>
            </div>
          </div>
        </aside>

        {/* CENTER CANVAS */}
        <main className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="label-eyebrow">Canvas</div>
              <div className="font-display text-xl tracking-tight">
                {tab === "image" ? "Text → Image" : tab === "animate" ? "Image → Motion" : "Text → Video"}
              </div>
            </div>
            <div className="label-eyebrow hidden md:block">
              {tab === "image" ? `${aspect} · ${style}` : `${videoSize} · ${duration}s`}
            </div>
          </div>

          <div className="flex-1 checker-bg grid place-items-center p-6 min-h-[420px]">
            {busy ? (
              <div className="flex flex-col items-center gap-4 text-zinc-300">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF4D4D]" />
                <div className="label-eyebrow">
                  {tab === "image" ? "Rendering 4K frame…" : "Compositing motion · this can take up to 5 minutes"}
                </div>
              </div>
            ) : result ? (
              <div className="fade-up max-w-4xl w-full">
                {result.kind === "image" ? (
                  <img
                    data-testid="canvas-image"
                    src={result.data.image_data_url}
                    alt={result.data.prompt}
                    className="w-full h-auto border border-white/10"
                  />
                ) : (
                  <video
                    data-testid="canvas-video"
                    src={videoUrl(result.data.video_id)}
                    controls
                    autoPlay
                    loop
                    className="w-full h-auto border border-white/10 bg-black"
                  />
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-zinc-400 line-clamp-1 pr-4">{result.data.prompt}</div>
                  <a
                    href={result.kind === "image" ? result.data.image_data_url : videoUrl(result.data.video_id)}
                    download={result.kind === "image" ? "kiema-image.png" : "kiema-video.mp4"}
                    data-testid="canvas-download"
                    className="px-3 py-1.5 border border-white/15 hover:bg-white/5 rounded-md text-sm inline-flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-md">
                <div className="w-12 h-12 mx-auto mb-4 grid place-items-center bg-[#FF4D4D]/10 border border-[#FF4D4D]/30">
                  <Sparkles className="w-5 h-5 text-[#FF4D4D]" />
                </div>
                <div className="font-display text-2xl tracking-tight">Describe your vision below.</div>
                <p className="text-sm text-zinc-500 mt-2">
                  KIEMA will render your prompt as a 4K image, animation, or cinematic clip.
                </p>
              </div>
            )}
          </div>

          {/* PROMPT BAR */}
          <div className="border-t border-white/10 bg-[#0E0E10] p-4">
            {tab === "animate" && (
              <div className="mb-3 flex items-center gap-3">
                {refImage ? (
                  <div className="relative">
                    <img src={refImage.dataUrl} alt="ref" className="h-16 w-16 object-cover border border-white/15" />
                    <button
                      onClick={() => setRefImage(null)}
                      className="absolute -top-2 -right-2 w-5 h-5 grid place-items-center bg-black border border-white/20 rounded-full"
                      data-testid="ref-image-clear"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    data-testid="ref-image-upload"
                    className="h-16 w-16 grid place-items-center border border-dashed border-white/20 cursor-pointer hover:border-[#FF4D4D] text-zinc-500 hover:text-white transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <input type="file" accept="image/*" hidden onChange={onUpload} />
                  </label>
                )}
                <div className="label-eyebrow">
                  {refImage ? "reference attached" : "upload a still to animate (optional)"}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <textarea
                data-testid="prompt-input"
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  tab === "image"
                    ? "A neon-lit Tokyo alley at midnight, rain reflections, cinematic 4K…"
                    : tab === "animate"
                    ? "Camera slowly pushes in, fog rolls through, embers float across the frame…"
                    : "A drone glides over a glowing canyon at sunset, dust catching the light…"
                }
                className="flex-1 bg-[#0A0A0B] border border-white/10 focus:border-[#FF4D4D] outline-none px-4 py-3 text-sm resize-none transition-colors"
              />
              <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                {tab === "image" ? (
                  <>
                    <select
                      data-testid="style-select"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="bg-[#0A0A0B] border border-white/10 px-3 h-10 text-sm hover:border-white/20"
                    >
                      {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      data-testid="aspect-select"
                      value={aspect}
                      onChange={(e) => setAspect(e.target.value)}
                      className="bg-[#0A0A0B] border border-white/10 px-3 h-10 text-sm hover:border-white/20"
                    >
                      {ASPECT_RATIOS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <select
                      data-testid="size-select"
                      value={videoSize}
                      onChange={(e) => setVideoSize(e.target.value)}
                      className="bg-[#0A0A0B] border border-white/10 px-3 h-10 text-sm hover:border-white/20"
                    >
                      {VIDEO_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <select
                      data-testid="duration-select"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="bg-[#0A0A0B] border border-white/10 px-3 h-10 text-sm hover:border-white/20"
                    >
                      {DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
                    </select>
                  </>
                )}
                <button
                  data-testid="generate-button"
                  onClick={handleGenerate}
                  disabled={busy}
                  className="btn-coral h-10 px-5 rounded-md inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </button>
              </div>
            </div>
            {tab !== "image" && (
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <AlertCircle className="w-3 h-3" />
                Video render uses Sora 2 — may take up to 5 minutes per clip.
              </div>
            )}
          </div>
        </main>

        {/* RIGHT PANEL - recent */}
        <aside className="lg:w-72 border-l border-white/10 bg-[#0E0E10]">
          <div className="p-5 border-b border-white/10">
            <div className="label-eyebrow">Recent</div>
            <div className="font-display text-xl tracking-tight">Session history</div>
          </div>
          <div className="p-3 grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="col-span-full p-4 label-eyebrow text-center">no generations yet</div>
            ) : recent.slice(0, 30).map((g) => (
              <button
                key={g.id}
                data-testid={`recent-${g.id}`}
                onClick={() => setResult({ kind: g.kind, data: g })}
                className="group relative aspect-square overflow-hidden border border-white/10 hover:border-[#FF4D4D] transition-colors"
                title={g.prompt}
              >
                {g.kind === "image" ? (
                  <img src={g.image_data_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-black relative">
                    <video src={videoUrl(g.video_id)} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 grid place-items-center">
                      <Film className="w-5 h-5 text-white/70" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {g.prompt}
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
