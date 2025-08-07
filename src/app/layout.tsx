"use client";

import { ReactNode, useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginModal from "@/components/auth/LoginModal";
import "./globals.css";

declare global {
  interface Window {
    __animatedBackgroundLoaded?: boolean;
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const [showLogin, setShowLogin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Mark when we're hydrated
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ---- Animated background setup (client-only) ----
  useEffect(() => {
    if (window.__animatedBackgroundLoaded) return;
    window.__animatedBackgroundLoaded = true;

    const canvas = document.createElement("canvas");
    canvas.id = "animated-bg-canvas";
    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "-1",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.6s ease",
    });
    document.body.appendChild(canvas);
    requestAnimationFrame(() => (canvas.style.opacity = "1"));

    const ctx = canvas.getContext("2d")!;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      { r: 40, g: 20, b: 100 },
      { r: 80, g: 40, b: 160 },
      { r: 255, g: 140, b: 0 },
    ];
    let gradientShift = 0;

    const createShapes = () => {
      const count = window.innerWidth < 768 ? 20 : 40;
      return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 20 + Math.random() * 40,
        dx: (-0.15 + Math.random() * 0.3) * 1.1,
        dy: (-0.15 + Math.random() * 0.3) * 1.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: ["circle", "hexagon", "star"][Math.floor(Math.random() * 3)],
        depth: 0.5 + Math.random() * 1.5,
      }));
    };

    let shapes = createShapes();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      shapes = createShapes();
    };
    window.addEventListener("resize", resize);

    const drawHexagon = (x: number, y: number, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(
          x + size * Math.cos((i * Math.PI) / 3),
          y + size * Math.sin((i * Math.PI) / 3)
        );
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawStar = (x: number, y: number, size: number) => {
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size / 2.5;
      let rot = Math.PI / 2 * 3;
      let step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(x, y - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let sx = x + Math.cos(rot) * outerRadius;
        let sy = y + Math.sin(rot) * outerRadius;
        ctx.lineTo(sx, sy);
        rot += step;
        sx = x + Math.cos(rot) * innerRadius;
        sy = y + Math.sin(rot) * innerRadius;
        ctx.lineTo(sx, sy);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      gradientShift += 0.0015;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(
        0,
        `rgba(${40 + 50 * Math.sin(gradientShift)},20,100,1)`
      );
      gradient.addColorStop(
        0.5,
        `rgba(80,${40 + 40 * Math.cos(gradientShift)},160,1)`
      );
      gradient.addColorStop(
        1,
        `rgba(255,${140 + 20 * Math.sin(gradientShift)},0,1)`
      );
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      shapes.forEach((shape) => {
        shape.x += shape.dx * shape.depth;
        shape.y += shape.dy * shape.depth;

        if (shape.x < -50) shape.x = width + 50;
        if (shape.x > width + 50) shape.x = -50;
        if (shape.y < -50) shape.y = height + 50;
        if (shape.y > height + 50) shape.y = -50;

        ctx.fillStyle = `rgba(${shape.color.r},${shape.color.g},${shape.color.b},0.25)`;
        ctx.shadowColor =
          shape.color.r === 255 && shape.color.g === 140 && shape.color.b === 0
            ? "rgba(255,140,0,0.8)"
            : `rgba(${shape.color.r},${shape.color.g},${shape.color.b},0.4)`;
        ctx.shadowBlur =
          shape.color.r === 255 && shape.color.g === 140 && shape.color.b === 0
            ? 25
            : 15;

        if (shape.type === "circle") {
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape.type === "hexagon") {
          drawHexagon(shape.x, shape.y, shape.size * 0.6);
        } else if (shape.type === "star") {
          drawStar(shape.x, shape.y, shape.size * 0.6);
        }
      });

      ctx.shadowBlur = 0;
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        {/* Static fallback background */}
        <div className="fixed inset-0 z-[-2] bg-gradient-to-br from-[#281464] via-[#5028A0] to-[#FF8C00]" />

        <header
          className={`z-50 border-b ${
            isClient
              ? "sticky top-0 backdrop-blur-md bg-white/10"
              : "relative bg-transparent"
          }`}
        >
          <Header onLoginClick={() => setShowLogin(true)} />
        </header>
        <main className="flex-grow relative z-10 page-transition">{children}</main>
        <Footer />
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </body>
    </html>
  );
}
