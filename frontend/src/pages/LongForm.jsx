import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { longform as lf, longformVideoUrl } from "@/lib/apiClient";
import { toast, Toaster } from "sonner";
import {
  Film, Wand2, Sparkles, Loader2, AlertCircle, Download, Trash2,
  Hourglass, CheckCircle2, XCircle, Plus, ChevronDown, ChevronUp,
  ImagePlus, X
} from "lucide-react";

const CLIP_DURATIONS = [4, 8, 12];
const SIZES = [
  { label: "Landscape · 1280x720", value: "1280x720" },
  { label: "Cinema · 1792x1024", value: "1792x1024" },
  { label: "Portrait · 1024x1792", value: "1024x1792" },
  { label: "Square · 1024x1024", value: "1024x1024" },
];
const PRESETS = [
  { label: "1 minute", seconds: 60 },
  { label: "5 minutes", seconds: 300 },
  { label: "15 minutes", seconds: 900 },
  { label: "30 minutes", seconds: 1800 },
];

const fmtClock = (s) => {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
};

const StatusBadge = ({ status }) => {
  const map = {
    queued: { i: Hourglass, c: "text-amber-300 border-amber-300/30 bg-amber-300/5" },
    rendering: { i: Loader2, c: "text-[#FF4D4D] border-[#FF4D4D]/30 bg-[#FF4D4D]/5 animate-pulse" },
    stitching: { i: Wand2, c: "text-blue-300 border-blue-300/30 bg-blue-300/5" },
    done: { i: CheckCircle2, c: "text-emerald-300 border-emerald-300/30 bg-emerald-300/5" },
    failed: { i: XCircle, c: "text-red-400 border-red-400/30 bg-red-400/5" },
  };
  const { i: Icon, c } = map[status] || map.queued;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] uppercase tracking-widest border ${c}`}>
      <Icon className={`w-3 h-3 ${status === "rendering" ? "animate-spin" : ""}`} />
      {status}
    </span>
  );
};

const JobCard = ({ job, onOpen, onDelete }) => {
  const pct = job.total_clips
    ? Math.round((100 * (job.completed_clips || 0)) / job.total_clips)
    : 0;
  return (
    <div
      data-testid={`job-card-${job.job_id}`}
      className="border border-white/10 bg-[#0F0F11] hover:border-white/20 transition-colors"
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={job.status} />
            <span className="label-eyebrow">{fmtClock(job.estimated_seconds)}</span>
          </div>
          <div className="font-display text-lg truncate">{job.title || "Untitled"}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {job.total_clips} scene{job.total_clips === 1 ? "" : "s"} · {job.clip_duration}s each · {job.size}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onOpen(job)}
            data-testid={`job-open-${job.job_id}`}
            className="px-2.5 py-1 border border-white/15 hover:bg-white/5 text-xs"
          >
            Open
          </button>
          <button
            onClick={() => onDelete(job)}
            data-testid={`job-delete-${job.job_id}`}
            className="px-2 py-1 border border-white/15 hover:bg-red-500/10 hover:border-red-500/40 text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="h-1 bg-white/5 overflow-hidden">
          <div
            className="h-full bg-[#FF4D4D] transition-all duration-500"
            style={{ width: `${job.status === "done" ? 100 : pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[11px] text-zinc-500 font-mono">
          <span>{job.completed_clips || 0} / {job.total_clips} clips</span>
          {job.status === "stitching" && <span>stitching…</span>}
          {job.status === "done" && <span>complete</span>}
          {job.error && <span className="text-red-400 truncate ml-3">{job.error}</span>}
        </div>
      </div>
    </div>
  );
};

export default function LongForm() {
  const [brief, setBrief] = useState("");
  const [targetSeconds, setTargetSeconds] = useState(60);
  const [clipDuration, setClipDuration] = useState(8);
  const [size, setSize] = useState("1280x720");
  const [title, setTitle] = useState("");
  // Each scene: {prompt: string, refDataUrl?: string, refB64?: string}
  const [scenes, setScenes] = useState([]);
  // Global style reference image (applied to scenes without their own ref)
  const [globalStyle, setGlobalStyle] = useState(null); // {dataUrl, b64}
  const [planning, setPlanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [openJob, setOpenJob] = useState(null);
  const [expandScenes, setExpandScenes] = useState(true);
  const pollRef = useRef(null);

  const loadJobs = useCallback(async () => {
    try {
      const r = await lf.list();
      setJobs(r.items || []);
    } catch {}
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Poll every 5s if any job is in progress
  useEffect(() => {
    const inProgress = jobs.some((j) => j.status === "queued" || j.status === "rendering" || j.status === "stitching");
    if (inProgress) {
      pollRef.current = setInterval(loadJobs, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobs, loadJobs]);

  // Refresh open job
  useEffect(() => {
    if (!openJob) return;
    if (openJob.status === "done" || openJob.status === "failed") return;
    const t = setInterval(async () => {
      try {
        const fresh = await lf.get(openJob.job_id);
        setOpenJob(fresh);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [openJob]);

  const sceneCount = Math.max(1, Math.min(200, Math.ceil(targetSeconds / clipDuration)));

  const handlePlan = async () => {
    if (!brief.trim()) {
      toast.error("Provide a brief first");
      return;
    }
    setPlanning(true);
    try {
      const r = await lf.plan({
        brief: brief.trim(),
        total_duration_s: targetSeconds,
        clip_duration: clipDuration,
      });
      // Convert planned text scenes into rich scene objects
      const planned = (r.scenes || []).map((p) => ({ prompt: p, refDataUrl: null, refB64: null }));
      setScenes(planned);
      if (!title) setTitle(brief.slice(0, 60));
      toast.success(`Planned ${r.count} scenes`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Planning failed");
    } finally {
      setPlanning(false);
    }
  };

  const handleStart = async () => {
    const ready = scenes.filter((s) => (s.prompt || "").trim().length > 0);
    if (ready.length === 0) {
      toast.error("Add at least one scene with a script");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        title: title || "Untitled",
        scenes: ready.map((s) => ({
          prompt: s.prompt.trim(),
          reference_image_b64: s.refB64 || null,
        })),
        clip_duration: clipDuration,
        size,
        style_reference_image_b64: globalStyle?.b64 || null,
      };
      const job = await lf.create(payload);
      toast.success("Render started — this can take a while");
      setOpenJob(job);
      setBrief("");
      setScenes([]);
      setTitle("");
      setGlobalStyle(null);
      loadJobs();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start render");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm("Delete this job and its files?")) return;
    try {
      await lf.remove(job.job_id);
      setJobs((xs) => xs.filter((x) => x.job_id !== job.job_id));
      if (openJob?.job_id === job.job_id) setOpenJob(null);
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const updateScenePrompt = (i, v) => {
    setScenes((s) => s.map((x, idx) => (idx === i ? { ...x, prompt: v } : x)));
  };
  const setSceneRef = (i, dataUrl, b64) => {
    setScenes((s) => s.map((x, idx) => (idx === i ? { ...x, refDataUrl: dataUrl, refB64: b64 } : x)));
  };
  const clearSceneRef = (i) => {
    setScenes((s) => s.map((x, idx) => (idx === i ? { ...x, refDataUrl: null, refB64: null } : x)));
  };
  const removeScene = (i) => setScenes((s) => s.filter((_, idx) => idx !== i));
  const addScene = () => setScenes((s) => [...s, { prompt: "", refDataUrl: null, refB64: null }]);

  const onPickFile = (i) => (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const b64 = dataUrl.split(",")[1] || "";
      setSceneRef(i, dataUrl, b64);
    };
    reader.readAsDataURL(f);
  };

  const onPickGlobalStyle = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const b64 = dataUrl.split(",")[1] || "";
      setGlobalStyle({ dataUrl, b64 });
    };
    reader.readAsDataURL(f);
  };

  const estimatedTotalSeconds = scenes.length * clipDuration;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Toaster theme="dark" position="bottom-right" />
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-6">
        {/* COMPOSER */}
        <section className="col-span-12 lg:col-span-7 space-y-6">
          <div>
            <div className="label-eyebrow">Long-form · Up to 30 minutes</div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tighter mt-1">
              Compose your epic.
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Upload reference pictures, write your script scene by scene, and KIEMA will follow
              your visuals — rendering each clip with Sora 2, then stitching them into a single video.
            </p>
          </div>

          <div className="border border-white/10 bg-[#0F0F11] p-5 space-y-4">
            <div>
              <label className="label-eyebrow">Brief / Story</label>
              <textarea
                data-testid="longform-brief"
                rows={4}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="A solo astronaut wakes up on Mars to find a single blooming flower — explore its origins across seasons, weather, and time…"
                className="mt-2 w-full bg-[#0A0A0B] border border-white/10 focus:border-[#FF4D4D] outline-none px-4 py-3 text-sm resize-none transition-colors"
              />
            </div>

            <div>
              <label className="label-eyebrow">Master style reference (optional)</label>
              <div className="mt-2 flex items-center gap-3">
                {globalStyle ? (
                  <div className="relative">
                    <img
                      src={globalStyle.dataUrl}
                      alt="style"
                      className="h-20 w-20 object-cover border border-white/15"
                    />
                    <button
                      onClick={() => setGlobalStyle(null)}
                      data-testid="global-style-clear"
                      className="absolute -top-2 -right-2 w-5 h-5 grid place-items-center bg-black border border-white/20 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    data-testid="global-style-upload"
                    className="h-20 w-20 grid place-items-center border border-dashed border-white/20 cursor-pointer hover:border-[#FF4D4D] text-zinc-500 hover:text-white transition-colors"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <input type="file" accept="image/*" hidden onChange={onPickGlobalStyle} />
                  </label>
                )}
                <div className="text-xs text-zinc-400 max-w-md leading-relaxed">
                  Upload a picture that captures the look you want — palette, character, mood. KIEMA will follow this style across every scene that doesn't have its own reference.
                </div>
              </div>
            </div>

            <div>
              <label className="label-eyebrow">Target length</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.seconds}
                    data-testid={`length-preset-${p.seconds}`}
                    onClick={() => setTargetSeconds(p.seconds)}
                    className={`px-3 py-1.5 text-sm border transition-colors ${
                      targetSeconds === p.seconds
                        ? "bg-[#FF4D4D] text-black border-[#FF4D4D]"
                        : "border-white/15 text-zinc-300 hover:border-white/30"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-1">
                  <input
                    data-testid="custom-length-min"
                    type="number"
                    min={1}
                    max={30}
                    value={Math.round(targetSeconds / 60)}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                      setTargetSeconds(v * 60);
                    }}
                    className="w-16 bg-[#0A0A0B] border border-white/15 px-2 py-1.5 text-sm"
                  />
                  <span className="text-xs text-zinc-500">min (1–30)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-eyebrow">Clip duration</label>
                <select
                  data-testid="clip-duration-select"
                  value={clipDuration}
                  onChange={(e) => setClipDuration(Number(e.target.value))}
                  className="mt-2 w-full bg-[#0A0A0B] border border-white/10 h-10 px-3 text-sm"
                >
                  {CLIP_DURATIONS.map((d) => <option key={d} value={d}>{d}s per clip</option>)}
                </select>
              </div>
              <div>
                <label className="label-eyebrow">Resolution</label>
                <select
                  data-testid="size-select"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="mt-2 w-full bg-[#0A0A0B] border border-white/10 h-10 px-3 text-sm"
                >
                  {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-eyebrow">Title (optional)</label>
                <input
                  data-testid="title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Mars Story"
                  className="mt-2 w-full bg-[#0A0A0B] border border-white/10 h-10 px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
              <div className="text-xs text-zinc-500">
                <span className="font-mono text-zinc-300">{sceneCount}</span> scenes
                · estimated total <span className="font-mono text-zinc-300">{fmtClock(sceneCount * clipDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  data-testid="plan-button"
                  onClick={handlePlan}
                  disabled={planning}
                  className="h-10 px-5 border border-white/15 hover:bg-white/5 inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  AI plan scenes
                </button>
                <button
                  data-testid="manual-add-scene"
                  onClick={() => {
                    addScene();
                    setExpandScenes(true);
                  }}
                  className="h-10 px-5 border border-white/15 hover:bg-white/5 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add scene manually
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-zinc-500 border border-white/5 bg-black/30 p-3">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-300" />
              <span>
                Long-form renders use Sora 2 sequentially. Each clip takes 2–5 min, so a 30-minute
                video can take several hours and significant Universal Key credits. Start small to validate.
              </span>
            </div>
          </div>

          {/* SCENE EDITOR */}
          {scenes.length > 0 && (
            <div className="border border-white/10 bg-[#0F0F11]">
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div>
                  <div className="label-eyebrow">Scene script</div>
                  <div className="text-sm text-zinc-300 mt-0.5">
                    {scenes.length} scene{scenes.length === 1 ? "" : "s"} · final length ≈ {fmtClock(estimatedTotalSeconds)}
                  </div>
                </div>
                <button
                  onClick={() => setExpandScenes((x) => !x)}
                  className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
                  data-testid="toggle-scenes"
                >
                  {expandScenes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expandScenes ? "Collapse" : "Show scenes"}
                </button>
              </div>
              {expandScenes && (
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {scenes.map((s, i) => (
                    <div key={i} className="border border-white/5 bg-black/30 p-3 flex gap-3">
                      <div className="label-eyebrow w-10 text-right shrink-0 pt-1">{(i + 1).toString().padStart(3, "0")}</div>

                      {/* Reference image slot */}
                      <div className="shrink-0">
                        {s.refDataUrl ? (
                          <div className="relative">
                            <img
                              data-testid={`scene-ref-thumb-${i}`}
                              src={s.refDataUrl}
                              alt={`scene ${i + 1} ref`}
                              className="h-20 w-20 object-cover border border-white/15"
                            />
                            <button
                              onClick={() => clearSceneRef(i)}
                              data-testid={`scene-ref-clear-${i}`}
                              className="absolute -top-2 -right-2 w-5 h-5 grid place-items-center bg-black border border-white/20 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label
                            data-testid={`scene-ref-upload-${i}`}
                            title="Add reference image for this scene"
                            className="h-20 w-20 grid place-items-center border border-dashed border-white/15 cursor-pointer hover:border-[#FF4D4D] text-zinc-500 hover:text-white transition-colors"
                          >
                            <ImagePlus className="w-4 h-4" />
                            <input type="file" accept="image/*" hidden onChange={onPickFile(i)} />
                          </label>
                        )}
                        <div className="label-eyebrow text-center mt-1 text-[9px]">
                          {s.refDataUrl ? "ref set" : "add ref"}
                        </div>
                      </div>

                      {/* Prompt textarea */}
                      <textarea
                        data-testid={`scene-${i}`}
                        value={s.prompt}
                        rows={3}
                        placeholder="Describe what happens in this scene…"
                        onChange={(e) => updateScenePrompt(i, e.target.value)}
                        className="flex-1 bg-[#0A0A0B] border border-white/10 focus:border-[#FF4D4D] outline-none px-3 py-2 text-sm resize-none"
                      />

                      <button
                        onClick={() => removeScene(i)}
                        className="px-2 self-start mt-1 text-zinc-500 hover:text-red-400"
                        data-testid={`scene-remove-${i}`}
                        title="Remove scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addScene}
                    data-testid="scene-add"
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-white/15 text-xs text-zinc-400 hover:text-white hover:border-white/30"
                  >
                    <Plus className="w-3 h-3" /> Add scene
                  </button>
                </div>
              )}
              <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  onClick={() => setScenes([])}
                  className="px-3 h-10 border border-white/15 text-sm hover:bg-white/5"
                  data-testid="reset-scenes"
                >
                  Reset
                </button>
                <button
                  data-testid="start-render-button"
                  onClick={handleStart}
                  disabled={creating}
                  className="btn-coral h-10 px-5 rounded-md inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                  Start render ({fmtClock(estimatedTotalSeconds)})
                </button>
              </div>
            </div>
          )}
        </section>

        {/* JOBS RAIL */}
        <aside className="col-span-12 lg:col-span-5 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="label-eyebrow">Render queue</div>
              <h2 className="font-display text-2xl tracking-tight">Your projects</h2>
            </div>
            <button
              onClick={loadJobs}
              className="text-xs text-zinc-400 hover:text-white"
              data-testid="refresh-jobs"
            >
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="border border-white/10 p-8 text-center">
              <Sparkles className="w-5 h-5 text-[#FF4D4D] mx-auto mb-3" />
              <div className="font-display text-lg">No long-form renders yet</div>
              <div className="text-xs text-zinc-500 mt-1">Compose your first epic on the left.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <JobCard key={j.job_id} job={j} onOpen={setOpenJob} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* DETAIL MODAL */}
      {openJob && (
        <div
          data-testid="job-detail"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md grid place-items-center p-6"
          onClick={() => setOpenJob(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#0E0E10] border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={openJob.status} />
                  <span className="label-eyebrow">
                    {openJob.completed_clips || 0} / {openJob.total_clips} clips · {fmtClock(openJob.estimated_seconds)}
                  </span>
                </div>
                <div className="font-display text-xl mt-1 truncate">{openJob.title}</div>
              </div>
              <button
                onClick={() => setOpenJob(null)}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
                data-testid="job-close"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="h-1.5 bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-[#FF4D4D] transition-all duration-500"
                  style={{
                    width: `${
                      openJob.status === "done"
                        ? 100
                        : Math.round((100 * (openJob.completed_clips || 0)) / Math.max(1, openJob.total_clips))
                    }%`,
                  }}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {openJob.status === "queued" && "Waiting to start…"}
                {openJob.status === "rendering" &&
                  `Rendering clip ${(openJob.completed_clips || 0) + 1} of ${openJob.total_clips}…`}
                {openJob.status === "stitching" && "Stitching final video with ffmpeg…"}
                {openJob.status === "done" && "Ready to download."}
                {openJob.status === "failed" && (openJob.error || "Render failed")}
              </div>
            </div>

            <div className="px-4 pb-4">
              {openJob.status === "done" ? (
                <video
                  data-testid="job-final-video"
                  src={longformVideoUrl(openJob.job_id)}
                  controls
                  className="w-full bg-black border border-white/10"
                />
              ) : (
                <div className="aspect-video checker-bg grid place-items-center text-zinc-500 text-sm">
                  Your final video will appear here when rendering completes.
                </div>
              )}
            </div>

            {openJob.status === "done" && (
              <div className="border-t border-white/10 p-4 flex items-center justify-end gap-2">
                <a
                  href={longformVideoUrl(openJob.job_id)}
                  download={`${(openJob.title || "kiema").replace(/\s+/g, "_")}.mp4`}
                  data-testid="job-download"
                  className="btn-coral h-10 px-5 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
