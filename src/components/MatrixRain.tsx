import { useEffect, useRef } from 'react';

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const pendoWords = ['PENDO', 'GUIDE', 'INSIGHTS', 'ANALYTICS', 'PRODUCT', 'EXPERIENCE', 'DATA', 'FEEDBACK', 'SURVEY', 'NPS'];
    const fontSize = 14;

    // Resolve brand pink from design system tokens
    const root = getComputedStyle(document.documentElement);
    const rawPink = (root.getPropertyValue('--pendo-pink') || root.getPropertyValue('--primary')).trim();
    const pink = rawPink ? `hsl(${rawPink})` : '#E94B8F';

    let columns = 0;
    let drops: number[] = [];
    let wordColumns: Map<number, { word: string; index: number }> = new Map();

    const setup = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      // Ensure CSS background is solid black as base
      canvas.style.backgroundColor = '#000';

      columns = Math.max(1, Math.floor(width / fontSize));
      const maxRows = Math.max(1, Math.ceil(height / fontSize));
      drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * maxRows));
      wordColumns = new Map();

      for (let i = 0; i < columns; i++) {
        // 5% chance to start a word column
        if (Math.random() < 0.05) {
          wordColumns.set(i, {
            word: pendoWords[Math.floor(Math.random() * pendoWords.length)],
            index: 0,
          });
        }
      }

      ctx.font = `${fontSize}px monospace`;
      // Ensure opaque black base on init/resize
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      // Create trailing effect with solid black base
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = pink; // Pendo pink via tokens
      ctx.shadowColor = pink;
      ctx.shadowBlur = 4;

      for (let i = 0; i < drops.length; i++) {
        let text: string;

        // Check if this column should display a Pendo word
        const wordData = wordColumns.get(i);
        if (wordData) {
          text = wordData.word[wordData.index % wordData.word.length];
          wordData.index++;

          // After word completes, small chance to start a new word
          if (wordData.index >= wordData.word.length * 3) {
            if (Math.random() < 0.3) {
              wordColumns.set(i, {
                word: pendoWords[Math.floor(Math.random() * pendoWords.length)],
                index: 0,
              });
            } else {
              wordColumns.delete(i);
            }
          }
        } else {
          text = characters[Math.floor(Math.random() * characters.length)];

          // Small chance to start a new word
          if (Math.random() < 0.001) {
            wordColumns.set(i, {
              word: pendoWords[Math.floor(Math.random() * pendoWords.length)],
              index: 0,
            });
          }
        }

        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    // Initial setup and start animation
    setup();
    const interval = setInterval(draw, 50);

    // Resize to parent using ResizeObserver so it works in headers/sections
    const ro = new ResizeObserver(() => {
      setup();
    });
    ro.observe(canvas.parentElement || canvas);

    return () => {
      clearInterval(interval);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full pointer-events-none bg-black"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
};

export default MatrixRain;
