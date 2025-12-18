import { useEffect, useState } from "react";

const COLORS = [
  "#10b981", // emerald-500
  "#34d399", // emerald-400
  "#6ee7b7", // emerald-300
  "#fbbf24", // amber-400
  "#f472b6", // pink-400
  "#60a5fa", // blue-400
];

const PARTICLE_COUNT = 50;

function Particle({ color, delay }) {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 50 + Math.random() * 100;
    const x = Math.cos(angle) * velocity;
    const y = Math.sin(angle) * velocity - 50; // Bias upward

    setStyle({
      "--x": `${x}px`,
      "--y": `${y}px`,
      "--rotate": `${Math.random() * 720 - 360}deg`,
      "--delay": `${delay}ms`,
      backgroundColor: color,
      width: `${4 + Math.random() * 8}px`,
      height: `${4 + Math.random() * 8}px`,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
    });
  }, [color, delay]);

  return (
    <div
      className="absolute left-1/2 top-1/2 animate-confetti opacity-0"
      style={style}
    />
  );
}

export default function Confetti({ trigger = true, duration = 3000 }) {
  const [particles, setParticles] = useState([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);

      // Generate particles
      const newParticles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 300,
      }));
      setParticles(newParticles);

      // Clean up after duration
      const timer = setTimeout(() => {
        setParticles([]);
        setIsActive(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [trigger, duration, isActive]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div className="absolute left-1/2 top-1/3">
        {particles.map((p) => (
          <Particle key={p.id} color={p.color} delay={p.delay} />
        ))}
      </div>
    </div>
  );
}
