import React, { useEffect } from 'react';
import { useRealtimeSaleCelebration } from '@/hooks/useRealtimeSaleCelebration';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const BALLOON_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F1948A', '#82E0AA',
];

function Balloon({ index, total }: { index: number; total: number }) {
  const color = BALLOON_COLORS[index % BALLOON_COLORS.length];
  const left = (index / total) * 100;
  const delay = Math.random() * 2;
  const size = 28 + Math.random() * 20;
  const drift = -30 + Math.random() * 60;

  return (
    <div
      className="absolute bottom-0 pointer-events-none"
      style={{
        left: `${left}%`,
        animation: `balloonFloat ${3 + Math.random() * 2}s ease-out ${delay}s forwards`,
      }}
    >
      <div
        style={{
          width: size,
          height: size * 1.2,
          backgroundColor: color,
          borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
          position: 'relative',
          opacity: 0.85,
          transform: `translateX(${drift}px)`,
        }}
      >
        {/* Balloon knot */}
        <div
          style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 6,
            height: 6,
            backgroundColor: color,
            borderRadius: '50%',
            filter: 'brightness(0.8)',
          }}
        />
        {/* String */}
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1,
            height: 25,
            backgroundColor: '#999',
          }}
        />
      </div>
    </div>
  );
}

function Confetti({ index }: { index: number }) {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFEAA7', '#DDA0DD', '#45B7D1', '#F1948A'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 1.5;
  const rotation = Math.random() * 360;

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left: `${left}%`,
        animation: `confettiFall ${2 + Math.random() * 2}s ease-in ${delay}s forwards`,
      }}
    >
      <div
        style={{
          width: 8 + Math.random() * 6,
          height: 6 + Math.random() * 4,
          backgroundColor: color,
          transform: `rotate(${rotation}deg)`,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

export function SaleCelebrationOverlay() {
  const { celebration, dismiss } = useRealtimeSaleCelebration();

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(dismiss, 7000);
    return () => clearTimeout(timer);
  }, [celebration, dismiss]);

  if (!celebration) return null;

  return (
    <>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes balloonFloat {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-110vh); opacity: 0; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrationPulse {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebrationFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
        onClick={dismiss}
      >
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        {/* Balloons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <Balloon key={`b-${i}`} index={i} total={15} />
          ))}
        </div>

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <Confetti key={`c-${i}`} index={i} />
          ))}
        </div>

        {/* Celebration Card */}
        <div
          className="relative z-10 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl px-8 py-10 mx-4 max-w-sm w-full text-center border border-gray-100 dark:border-gray-800"
          style={{ animation: 'celebrationPulse 0.5s ease-out forwards' }}
        >
          <div className="text-6xl mb-4">
            🎉
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Venda Realizada!
          </h2>
          <p className="text-lg text-muted-foreground mb-4">
            <span className="font-semibold text-foreground">{celebration.closerName}</span>
            {celebration.sales > 1
              ? ` fechou ${celebration.sales} vendas!`
              : ' fechou uma venda!'}
          </p>
          {celebration.revenue > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl py-4 px-6">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                Faturamento
              </p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(celebration.revenue)}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Toque para fechar
          </p>
        </div>
      </div>
    </>
  );
}
