"use client";
import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

export default function AnimatedNumber({ to = 0, duration = 1.2, suffix = "", style = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate(v) {
        if (ref.current) ref.current.textContent = Math.round(v) + suffix;
      },
    });
    return () => controls.stop();
  }, [to, duration, suffix]);

  return <span ref={ref} style={style}>0{suffix}</span>;
}
