"use client";

export default function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Top-left glow */}
      <div
        className="
          absolute
          -top-100 -left-40
          w-80 h-160
          rounded-full
          bg-linear-to-br
          from-white/5 from-75%
          via-white/50 via-90%

          to-transparent
            blur-xl
        "
      />

      {/* Bottom-right glow */}
      <div
        className="
          absolute
          -bottom-60 -right-80
          w-155 h-100
          rounded-full
          bg-linear-to-tl
          from-white/5 from-75%
          via-white/50 via-90%
          to-transparent
          blur-xl
        "
      />

      {/* Optional subtle noise layer (VERY subtle, professional) */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,rgba(255,255,255,0.015)_1px)] bg-size-[24px_24px]" />
    </div>
  );
}
