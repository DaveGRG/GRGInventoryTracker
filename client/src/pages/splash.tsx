import { useState, useEffect, useRef } from "react";
import splashBg from "@assets/image_1771868325773.png";
import logoImg from "@assets/image_1771872671169.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/splash-chord.wav");
    audioRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => setPhase(3), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleContinue = () => {
    if (completedRef.current) return;
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    completedRef.current = true;
    onComplete();
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      data-testid="splash-screen"
      onClick={phase >= 3 ? handleContinue : undefined}
      onKeyDown={phase >= 3 ? handleContinue : undefined}
      tabIndex={0}
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
        cursor: phase >= 3 ? "pointer" : "default",
        outline: "none",
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
          width: "min(240px, 55vw)",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 1.5s ease",
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
