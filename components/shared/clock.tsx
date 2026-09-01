"use client";

import { useEffect, useState } from "react";

export function Clock({ className }: { className?: string }) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <span className={className}>--:--</span>;

  return <span className={className}>{time}</span>;
}
