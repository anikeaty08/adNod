export function FileUpload() {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-sky-300/70 bg-sky-50/60 px-6 py-10 text-center dark:border-sky-500/20 dark:bg-sky-500/10">
      <span className="font-medium">Upload creative asset</span>
      <span className="mt-2 text-sm text-muted-foreground">Drag video, image, or HTML bundle metadata here.</span>
      <input type="file" className="hidden" />
    </label>
  );
}
