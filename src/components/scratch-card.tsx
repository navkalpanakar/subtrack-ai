"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Sparkles, Loader2 } from "@/components/icons";
import { CheckCircle2 } from "lucide-react";
import { useScratchReward, type RedeemedReward } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";

// Gamified scratch-card reveal. User drags/touches to "scratch" off the
// foil and reveal the coupon underneath. The reveal is committed to the
// backend (so the offer is fixed per card).
export function ScratchCard({
  reward,
  providerHint,
}: {
  reward: RedeemedReward;
  providerHint?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(reward.revealed);
  const [scratching, setScratching] = useState(false);
  const [scratchPct, setScratchPct] = useState(reward.revealed ? 100 : 0);
  const scratch = useScratchReward();

  const tierColor =
    reward.tier === "gold"
      ? "from-amber-400 to-yellow-600"
      : reward.tier === "silver"
      ? "from-slate-300 to-slate-500"
      : "from-orange-400 to-amber-700";

  // Initialize the canvas foil
  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    // Foil gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#9ca3af");
    grad.addColorStop(0.5, "#d1d5db");
    grad.addColorStop(1, "#6b7280");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Sparkle dots
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(17,24,39,0.7)";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH TO REVEAL", w / 2, h / 2 - 6);
    ctx.font = "11px system-ui";
    ctx.fillText("👆 drag here", w / 2, h / 2 + 14);
    ctx.globalCompositeOperation = "destination-out";
  }, [revealed]);

  const doScratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    // Sample scratched percentage
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    const step = 24; // sample every Nth pixel for perf
    let total = 0;
    for (let i = 3; i < data.length; i += step * 4) {
      total++;
      if (data[i] === 0) cleared++;
    }
    const pct = Math.round((cleared / total) * 100);
    setScratchPct(pct);
    if (pct >= 45 && !revealed) {
      reveal();
    }
  };

  const reveal = async () => {
    setRevealed(true);
    if (!reward.revealed) {
      await scratch.mutateAsync({ redeemedRewardId: reward.id, provider: providerHint });
    }
  };

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{reward.icon}</span>
          <div>
            <p className="text-sm font-semibold">{reward.title}</p>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white bg-gradient-to-r ${tierColor} inline-block`}>
              {reward.tier}
            </span>
          </div>
        </div>
        {revealed ? (
          <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Revealed
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{scratchPct}% scratched</span>
        )}
      </div>

      <div className="relative aspect-[2/1] rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-amber-400/10">
        {/* Reward underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          {revealed ? (
            scratch.isPending ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Finding your deal…
              </div>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-primary mb-1" />
                <p className="text-sm font-bold leading-snug line-clamp-2">{reward.offerTitle || "Deal unlocked!"}</p>
                {reward.offerDetail && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{reward.offerDetail}</p>
                )}
                {reward.offerUrl && (
                  <a
                    href={reward.offerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 text-[11px] text-primary font-medium inline-flex items-center gap-1"
                  >
                    Open deal <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </>
            )
          ) : (
            <div className="text-center text-muted-foreground">
              <p className="text-xs font-medium">🎁 A real coupon is hiding under here</p>
              <p className="text-[10px] mt-0.5">Scratch 45% to reveal</p>
            </div>
          )}
        </div>
        {/* Scratch foil canvas */}
        {!revealed && (
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            className="absolute inset-0 w-full h-full touch-none cursor-pointer"
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setScratching(true); const p = getPos(e); doScratch(p.x, p.y); }}
            onPointerMove={(e) => { if (scratching) { const p = getPos(e); doScratch(p.x, p.y); } }}
            onPointerUp={() => setScratching(false)}
            onPointerLeave={() => setScratching(false)}
          />
        )}
      </div>

      {!revealed ? (
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-8" onClick={reveal}>
          Reveal without scratching
        </Button>
      ) : (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          ✅ Card revealed — unlock another from the rewards above to scratch again
        </p>
      )}
    </div>
  );
}
