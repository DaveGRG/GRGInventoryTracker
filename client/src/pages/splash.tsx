import { useState, useEffect, useRef, useCallback } from "react";
import splashBg from "@assets/image_1771868325773.png";
import logoImg from "@assets/image_1771694966878.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/splash-chord.wav");
    audioRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => {
      setPhase(2);
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }, 2800);
    const t3 = setTimeout(() => setPhase(3), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const audioPlayedRef = useRef(false);

  const advance = useCallback(() => {
    if (audioRef.current && !audioPlayedRef.current) {
      audioPlayedRef.current = true;
      audioRef.current.play().catch(() => {});
    }
    if (phase >= 3) {
      onComplete();
    }
  }, [phase, onComplete]);

  useEffect(() => {
    if (phase < 3) return;
    const handleKey = () => advance();
    const handleTouch = () => advance();
    window.addEventListener("keydown", handleKey);
    window.addEventListener("click", handleTouch);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleTouch);
    };
  }, [phase, advance]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      data-testid="splash-screen"
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <img
        src={splashBg}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          height: "100%",
          width: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 4.5s ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 4.5s ease",
        }}
      />

      <img
        src={logoImg}
        alt="GRG Playscapes"
        data-testid="splash-logo"
        style={{
          position: "absolute",
          zIndex: 2,
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(280px, 60vw)",
          borderRadius: "16px",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 1.5s ease",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      />

      <p
        data-testid="splash-continue-text"
        style={{
          position: "absolute",
          zIndex: 2,
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.85)",
          fontSize: "14px",
          fontWeight: 300,
          letterSpacing: "2px",
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.8s ease",
          animation: phase >= 3 ? "pulse 2.5s ease-in-out infinite" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {isMobile ? "Tap to continue" : "Press any key to continue"}
      </p>
    </div>
  );
}
