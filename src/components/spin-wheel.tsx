"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Clock } from "lucide-react";
import { useSpinState, useSpin } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Daily spin-the-wheel built with SVG arcs for accurate segment placement.
// One free spin per 24 hours. Shows a live countdown timer when already spun.
export function SpinWheel() {
  const { data: spinState } = useSpinState();
  const spin = useSpin();
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const pendingResult = useRef<{ points: number; index: number } | null>(null);

  // Countdown timer for next spin
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!spinState?.nextSpinAt) return;
    const update = () => {
      const target = new Date(spinState.nextSpinAt!).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("Available now!");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [spinState?.nextSpinAt]);

  const wheel = spinState?.wheel || [5, 10, 15, 20, 25, 50, 100, 200];
  const seg = 360 / wheel.length;

  const handleSpin = async () => {
    setResult(null);
    setSpinning(true);
    const res = await spin.mutateAsync(false);
    if (res.spun && res.index !== undefined) {
      pendingResult.current = { points: res.points, index: res.index };
      const target = 360 * 5 - (res.index * seg + seg / 2);
      setRotation(target);
    } else {
      setSpinning(false);
    }
  };

  const handleAnimationComplete = async () => {
    if (pendingResult.current) {
      const { points } = pendingResult.current;
      setResult(points);
      setSpinning(false);
      pendingResult.current = null;
      await spin.mutateAsync(true);
      toast.success(`🎉 You won ${points} points!`, {
        description: "Points added to your balance",
      });
    }
  };

  const colors = [
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#3b82f6", "#ec4899", "#14b8a6", "#f97316",
  ];

  const radius = 80;
  const cx = 90;
  const cy = 90;

  const arcPath = (startDeg: number, endDeg: number) => {
    const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(toRad(startDeg));
    const y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(endDeg));
    const y2 = cy + radius * Math.sin(toRad(endDeg));
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const hasSpun = !spinState?.canSpin && spinState?.todayPoints !== undefined;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Daily Spin
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {spinState?.canSpin
            ? "1 free spin today!"
            : `Won ${spinState?.todayPoints || 0} pts today`}
        </span>
      </div>

      <div className="relative mx-auto w-48 h-48 mb-3">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[16px] border-t-foreground drop-shadow" />
        </div>

        {/* Wheel */}
        <motion.div
          className="w-full h-full"
          animate={{ rotate: rotation }}
          transition={{ duration: 3.5, ease: [0.17, 0.67, 0.3, 0.99] }}
          onAnimationComplete={handleAnimationComplete}
        >
          <svg viewBox="0 0 180 180" className="w-full h-full">
            <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary/30" />
            {wheel.map((pts, i) => {
              const startDeg = i * seg;
              const endDeg = (i + 1) * seg;
              const midDeg = startDeg + seg / 2;
              const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
              const labelR = radius * 0.65;
              const lx = cx + labelR * Math.cos(toRad(midDeg));
              const ly = cy + labelR * Math.sin(toRad(midDeg));
              return (
                <g key={i}>
                  <path
                    d={arcPath(startDeg, endDeg)}
                    fill={colors[i % colors.length]}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-bold"
                    fill="white"
                    fontSize={14}
                  >
                    {pts}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Center hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary z-10 shadow-md">
          SPIN
        </div>
      </div>

      {/* Result */}
      {result !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-2"
        >
          <p className="text-2xl font-bold text-primary">+{result} points!</p>
        </motion.div>
      )}

      {/* Spin button OR countdown timer */}
      {spinState?.canSpin ? (
        <Button
          onClick={handleSpin}
          disabled={!spinState?.canSpin || spin.isPending || spinning}
          className="w-full"
        >
          {spin.isPending || spinning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Spin now (free)"
          )}
        </Button>
      ) : (
        <div className="space-y-2">
          {/* Countdown timer */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Next spin in</span>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {timeLeft || "Loading..."}
            </p>
          </div>
          <Button disabled className="w-full opacity-60">
            <Clock className="h-4 w-4 mr-2" />
            Come back tomorrow
          </Button>
        </div>
      )}
    </div>
  );
}
