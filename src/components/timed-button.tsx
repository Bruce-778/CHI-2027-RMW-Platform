"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ClockCountdown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/rmw-types";

type TimedButtonProps = {
  seconds?: number;
  ready?: boolean;
  locale: Locale;
  label: string;
  blockedLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  onClick: () => void;
};

export function TimedButton({
  seconds = 5,
  ready = true,
  locale,
  label,
  blockedLabel,
  className,
  variant = "default",
  onClick,
}: TimedButtonProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [seconds]);

  const waiting = remaining > 0;
  const disabled = waiting || !ready;
  const text = waiting
    ? (locale === "zh-CN" ? `请先阅读 ${remaining} 秒` : `Read for ${remaining}s`)
    : ready
      ? label
      : blockedLabel || (locale === "zh-CN" ? "请先完成本页" : "Complete this page first");

  return (
    <Button className={className} variant={variant} disabled={disabled} onClick={onClick}>
      {waiting ? <ClockCountdown /> : null}
      {text}
      {!waiting && ready ? <ArrowRight /> : null}
    </Button>
  );
}
