export function VideoHero() {
  return (
    <section className="page-shell pb-8">
      <div className="glass-panel overflow-hidden rounded-[32px] p-3">
        <video className="h-[260px] w-full rounded-[28px] object-cover sm:h-[420px]" src="/adnode-intro.mp4" autoPlay muted playsInline />
      </div>
    </section>
  );
}
