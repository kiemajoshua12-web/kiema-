import React, { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { generations as genApi, videoUrl } from "@/lib/apiClient";
import { Trash2, Download, Image as ImageIcon, Film } from "lucide-react";
import { toast, Toaster } from "sonner";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await genApi.list(filter === "all" ? null : filter);
      setItems(r.items || []);
    } catch (e) {
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await genApi.remove(id);
      setItems(items.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Removed");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Toaster theme="dark" position="bottom-right" />
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="label-eyebrow">Your archive</div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tighter">Gallery</h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-md">
              Every image and video you generate is saved here. Re-prompt, download, or remove anytime.
            </p>
          </div>

          <div className="flex border border-white/10">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                data-testid={`filter-${f.id}`}
                onClick={() => setFilter(f.id)}
                className={`px-4 h-9 text-sm transition-colors ${
                  filter === f.id
                    ? "bg-[#FF4D4D] text-black"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="label-eyebrow">Loading…</div>
        ) : items.length === 0 ? (
          <div className="border border-white/10 p-16 text-center">
            <div className="label-eyebrow mb-3">Empty</div>
            <div className="font-display text-2xl">No generations yet</div>
            <p className="text-sm text-zinc-500 mt-2">Head over to Studio and create your first piece.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((g) => (
              <button
                key={g.id}
                data-testid={`gallery-item-${g.id}`}
                onClick={() => setSelected(g)}
                className="group relative aspect-square overflow-hidden border border-white/10 hover:border-[#FF4D4D] transition-colors text-left"
              >
                {g.kind === "image" ? (
                  <img src={g.image_data_url} alt={g.prompt} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-black relative">
                    <video src={videoUrl(g.video_id)} className="w-full h-full object-cover" muted />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 label-eyebrow flex items-center gap-1">
                      <Film className="w-3 h-3" /> Video
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-xs text-white line-clamp-2">{g.prompt}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detail modal */}
        {selected && (
          <div
            data-testid="gallery-detail"
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 grid place-items-center p-6"
            onClick={() => setSelected(null)}
          >
            <div
              className="max-w-5xl w-full bg-[#0E0E10] border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2 label-eyebrow">
                  {selected.kind === "image" ? <ImageIcon className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                  {selected.kind === "image" ? "Image" : "Video"} · {new Date(selected.created_at).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selected.kind === "image" ? selected.image_data_url : videoUrl(selected.video_id)}
                    download
                    data-testid="detail-download"
                    className="px-3 py-1.5 border border-white/15 hover:bg-white/5 text-sm inline-flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    data-testid="detail-delete"
                    className="px-3 py-1.5 border border-white/15 hover:bg-red-500/10 hover:border-red-500/40 text-sm inline-flex items-center gap-2 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
              <div className="p-4 bg-black grid place-items-center">
                {selected.kind === "image" ? (
                  <img src={selected.image_data_url} alt={selected.prompt} className="max-h-[70vh] w-auto" />
                ) : (
                  <video src={videoUrl(selected.video_id)} controls autoPlay className="max-h-[70vh] w-auto" />
                )}
              </div>
              <div className="p-4 border-t border-white/10 text-sm text-zinc-300">{selected.prompt}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
