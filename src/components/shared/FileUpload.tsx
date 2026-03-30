import { useRef, useState } from "react";
import { uploadCreativeToIpfs } from "@/lib/ipfs";

export function FileUpload({
  onUploaded,
}: {
  onUploaded?: (uri: string) => void;
}) {
  const [status, setStatus] = useState("Drag video or image here.");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/", "video/"].some((prefix) => file.type.startsWith(prefix))) {
      setStatus("Only image and mp4/video files are supported.");
      return;
    }

    setStatus("Uploading to IPFS...");

    try {
      const uri = await uploadCreativeToIpfs(file);
      onUploaded?.(uri);
      setStatus(`Uploaded: ${uri}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "IPFS upload failed.");
    }
  };

  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-sky-300/70 bg-sky-50/60 px-6 py-10 text-center dark:border-sky-500/20 dark:bg-sky-500/10">
      <span className="font-medium">Upload creative asset</span>
      <span className="mt-2 text-sm text-muted-foreground">{status}</span>
      <input ref={inputRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(event) => void handleFileChange(event)} />
    </label>
  );
}
