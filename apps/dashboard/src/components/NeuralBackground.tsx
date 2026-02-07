"use client";

import { useEffect, useRef } from "react";

interface NeuralBackgroundProps {
  className?: string;
  color?: string;
  backgroundVariable?: string;
  trailOpacity?: number;
  particleCount?: number;
  speed?: number;
}

export default function NeuralBackground({
  className,
  color = "#38BDF8",
  backgroundVariable = "--bg-primary",
  trailOpacity = 0.15,
  particleCount = 600,
  speed = 1,
}: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = container.clientWidth;
    let height = container.clientHeight;
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
      life: number;
    };

    let particles: Particle[] = [];
    let animationFrameId = 0;
    let mouse = { x: -1000, y: -1000 };
    let trailFillColor = "#0B1020";

    const readThemeBackground = () => {
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue(backgroundVariable)
        .trim();
      return bg || "#0B1020";
    };

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      age: 0,
      life: Math.random() * 200 + 100,
    });

    const resetParticle = (particle: Particle) => {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
      particle.vx = 0;
      particle.vy = 0;
      particle.age = 0;
      particle.life = Math.random() * 200 + 100;
    };

    const updateParticle = (particle: Particle) => {
      const angle =
        (Math.cos(particle.x * 0.005) + Math.sin(particle.y * 0.005)) * Math.PI;

      particle.vx += Math.cos(angle) * 0.2 * speed;
      particle.vy += Math.sin(angle) * 0.2 * speed;

      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const interactionRadius = 150;

      if (distance < interactionRadius) {
        const force = (interactionRadius - distance) / interactionRadius;
        particle.vx -= dx * force * 0.05;
        particle.vy -= dy * force * 0.05;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.95;
      particle.vy *= 0.95;

      particle.age += 1;
      if (particle.age > particle.life) {
        resetParticle(particle);
      }

      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
    };

    const drawParticle = (
      particle: Particle,
      context: CanvasRenderingContext2D,
    ) => {
      const alpha = 1 - Math.abs(particle.age / particle.life - 0.5) * 2;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(particle.x, particle.y, 1.5, 1.5);
    };

    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = [];
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(createParticle());
      }
    };

    const animate = () => {
      ctx.globalAlpha = trailOpacity;
      ctx.fillStyle = trailFillColor;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      particles.forEach((particle) => {
        updateParticle(particle);
        drawParticle(particle, ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      init();
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouse = { x: -1000, y: -1000 };
    };

    trailFillColor = readThemeBackground();
    const themeObserver = new MutationObserver(() => {
      trailFillColor = readThemeBackground();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    init();

    if (reduceMotion) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = trailFillColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      animate();
    }

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      themeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [backgroundVariable, color, trailOpacity, particleCount, speed]);

  const containerClassName = className
    ? `h-full w-full overflow-hidden ${className}`
    : "h-full w-full overflow-hidden";

  return (
    <div ref={containerRef} className={containerClassName}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
