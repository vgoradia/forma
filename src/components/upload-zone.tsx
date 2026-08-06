"use client";

import { useCallback, useState } from "react";
import { Upload, Link2, Search, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageFile, createStoragePreview, readFilePreview } from "@/lib/image";

type InputMode = "upload" | "link" | "search";

interface UploadZoneProps {
  onAnalyze: (data: FormData, meta?: { imagePreview?: string }) => void;
  isLoading: boolean;
  loadingMessage?: string;
  initialMode?: InputMode;
  initialQuery?: string;
}

export function UploadZone({
  onAnalyze,
  isLoading,
  loadingMessage,
  initialMode,
  initialQuery = "",
}: UploadZoneProps) {
  const [mode, setMode] = useState<InputMode>(initialMode ?? "upload");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [isPreparing, setIsPreparing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreview(await readFilePreview(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    const formData = new FormData();

    if (mode === "upload" && selectedFile) {
      setIsPreparing(true);
      try {
        const compressed = await compressImageFile(selectedFile);
        formData.append("image", compressed, compressed.name);
        const storagePreview = preview ? await createStoragePreview(preview) : undefined;
        onAnalyze(formData, { imagePreview: storagePreview });
      } finally {
        setIsPreparing(false);
      }
    } else if (mode === "link" && link.trim()) {
      formData.append("url", link.trim());
      onAnalyze(formData);
    } else if (mode === "search" && query.trim()) {
      formData.append("query", query.trim());
      onAnalyze(formData);
    }
  };

  const canSubmit =
    (mode === "upload" && selectedFile) ||
    (mode === "link" && link.trim()) ||
    (mode === "search" && query.trim());

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  const busy = isLoading || isPreparing;

  return (
    <div className="w-full max-w-2xl lg:max-w-none">
      <div className="mb-6 flex rounded-2xl bg-gray-100 p-1">
        {(
          [
            { id: "upload" as const, label: "Upload", icon: Upload },
            { id: "link" as const, label: "Paste link", icon: Link2 },
            { id: "search" as const, label: "Describe", icon: Search },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all",
              mode === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-forma-muted hover:text-gray-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex min-h-[280px] flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all",
            dragOver
              ? "border-stone-400 bg-stone-50"
              : "border-stone-200 bg-white hover:border-stone-300",
            preview && "border-solid p-2"
          )}
        >
          {preview ? (
            <>
              <img src={preview} alt="Upload preview" className="max-h-[260px] rounded-2xl object-contain" />
              <button
                onClick={clearPreview}
                className="absolute right-4 top-4 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <X className="h-4 w-4 text-stone-600" />
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                <ImageIcon className="h-8 w-8 text-stone-400" />
              </div>
              <p className="mb-1 text-base font-medium text-stone-800">
                Drop a screenshot or photo
              </p>
              <p className="mb-4 text-sm text-stone-500">
                From TikTok, Pinterest, Instagram, or anywhere
              </p>
              <label className="cursor-pointer rounded-full bg-forma-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-forma-primary-dark">
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </label>
            </>
          )}
        </div>
      )}

      {mode === "link" && (
        <div className="rounded-3xl border border-stone-200 bg-white p-8">
          <label className="mb-2 block text-sm font-medium text-stone-700">Product URL</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.nordstrom.com/s/..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
          <p className="mt-3 text-xs text-stone-400">
            Paste a link from any retailer — Amazon, Nordstrom, Zara, and more
          </p>
        </div>
      )}

      {mode === "search" && (
        <div className="rounded-3xl border border-stone-200 bg-white p-8">
          <label className="mb-2 block text-sm font-medium text-stone-700">Describe the item</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Oversized camel blazer from TikTok, double-breasted with relaxed fit..."
            rows={4}
            className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </div>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={!canSubmit || busy}
        className={cn(
          "mt-6 w-full rounded-2xl py-4 text-base font-medium transition-all",
          canSubmit && !busy
            ? "bg-forma-primary text-white hover:bg-forma-primary-dark hover:shadow-lg"
            : "cursor-not-allowed bg-gray-200 text-gray-400"
        )}
      >
        {busy ? (
          <span className="flex flex-col items-center justify-center gap-1">
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {isPreparing ? "Preparing image..." : "Analyzing..."}
            </span>
            {loadingMessage && !isPreparing && (
              <span className="text-xs font-normal text-white/70">{loadingMessage}</span>
            )}
          </span>
        ) : (
          "Analyze with Forma"
        )}
      </button>
    </div>
  );
}
