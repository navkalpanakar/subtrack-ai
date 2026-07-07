"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useSpinState, useSpin } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Daily spin-the-wheel. One free spin per day. Weighted random rewards.
// The spin API is called immediately (to lock in the result server-side),
// but the points toast only shows AFTER the wheel animation finishes.
export function SpinWheel() {
  const { data: spinState } = useSpinState();
  const spin = useSpin();
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const pendingResult = useRef<number | null>(null);

  const wheel = spinState?.wheel || [5, 10, 15, 20, 25, 50, 100, 200];
  const segmentAngle = 360 / wheel.length;

  const handleSpin = async () => {
    setResult(null);
    setSpinning(true);
    // Call the API to lock in the result (server awards points immediately)
    const res = await spin.mutateAsync();
    if (res.spun && res.index !== undefined) {
      pendingResult.current = res.points;
      // Animate to the winning segment (5 full rotations + segment)
      const targetAngle = 360 * 5 + (360 - res.index * segmentAngle - segmentAngle / 2);
      setRotation(targetAngle);
      // The toast/result will be revealed by onAnimationComplete
    } else {
      setSpinning(false);
      // "already spun" toast already shown by the hook
    }
  };

  const handleAnimationComplete = () => {
    if (pendingResult.current !== null) {
      const pts = pendingResult.current;
      setResult(pts);
      setSpinning(false);
      pendingResult.current = null;
      // Show the points toast only now, after the wheel has stopped
      toast.success(`🎉 You won ${pts} points!`, {
        description: "Points added to your balance",
      });
    }
  };

  const colors = [
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#3b82f6", "#ec4899", "#14b8a6", "#f97316",
  ];

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Daily Spin
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {spinState?.canSpin ? "1 free spin today!" : `Won ${spinState?.todayPoints} pts today`}
        </span>
      </div>

      <div className="relative mx-auto w-44 h-44 mb-3">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 -mt-1">
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-foreground" />
        </div>
        {/* Wheel */}
        <motion.div
          className="w-full h-full rounded-full relative overflow-hidden border-4 border-primary/30"
          animate={{ rotate: rotation }}
          transition={{ duration: 3.5, ease: [0.17, 0.67, 0.3, 0.99] }}
          onAnimationComplete={handleAnimationComplete}
        >
          {wheel.map((pts, i) => {
            const angle = i * segmentAngle;
            return (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((segmentAngle / 2) * Math.PI / 180)}% 0%)`,
                  backgroundColor: colors[i % colors.length],
                }}
              >
                <span
                  className="text-white font-bold text-xs absolute"
                  style={{
                    top: "15%",
                    transform: `rotate(${segmentAngle / 2}deg)`,
                  }}
                >
                  {pts}
                </span>
              </div>
            );
          })}
        </motion.div>
        {/* Center hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary">
          SPIN
        </div>
      </div>

      {/* Result — shows where the wheel stopped */}
      {result !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-2"
        >
          <p className="text-2xl font-bold text-primary">+{result} points!</p>
        </motion.div>
      )}

      <Button
        onClick={handleSpin}
        disabled={!spinState?.canSpin || spin.isPending || spinning}
        className="w-full"
      >
        {spin.isPending || spinning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : spinState?.canSpin ? (
          "Spin now (free)"
        ) : (
          "Come back tomorrow"
        )}
      </Button>
    </div>
  );
}
