import { useEffect, useState } from "react";
import { CircleCheckIcon, InfoIcon, OctagonXIcon, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "error" | "success" | "info";
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 50);

    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 200); // match exit animation
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onDismiss]);

  const IconComponent = {
    error: OctagonXIcon,
    success: CircleCheckIcon,
    info: InfoIcon,
  }[type];

  return (
    <div
      className={`
        fixed top-6 left-1/2 -translate-x-1/2 z-50
        ${leaving ? "animate-toast-out" : "animate-toast-in"}
      `}
    >
      <div
        className={`border rounded-lg shadow-lg overflow-hidden bg-black/70 text-white border-white/20 w-80`}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <IconComponent className="w-5 h-5 shrink-0" strokeWidth={2} />
          <p className="text-sm font-medium flex-1">{message}</p>
          <button
            onClick={() => {
              setLeaving(true);
              setTimeout(onDismiss, 200);
            }}
            className="border border-white/50 p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 shrink-0" strokeWidth={4}/>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-black/10">
          <div
            className={`h-full bg-white transition-all duration-50 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
