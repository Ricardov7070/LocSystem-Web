/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useCallback } from 'react';
import logoImage from '../../assets/logo_locsystem.png';
import { Card } from '../ui/card';
import backgroundImage from '../../assets/background_locsystem.png';

export default function AuthLayout({
  children,
  hideHeader = false,
}: {
  children: React.ReactNode;
  hideHeader?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 12, y: -10 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // Posição X do mouse dentro do elemento
    const y = e.clientY - rect.top;  // Posição Y do mouse dentro do elemento
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // O eixo X é invertido para que o lado pesado (mouse) empurre para trás
    const rotateX = ((centerY - y) / centerY) * 20; 
    const rotateY = ((x - centerX) / centerX) * 20;

    setRotation({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 12, y: -10 }); // Volta para a posição inicial em 3D
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img
          src={backgroundImage}
          alt="Estrada noturna com luzes de veículos em movimento"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <main className="container relative z-10 mx-auto flex h-screen max-w-lg flex-col justify-center px-4">
        {!hideHeader && (
          <header className="mb-8 text-center">
            <div className="mb-10 flex justify-center">
              <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleMouseEnter}
                className="group relative h-44 w-44 [perspective:1000px] cursor-pointer"
              >
                <div 
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-t-white/20 border-l-white/20 border-b-black/80 border-r-black/80 border-b-[6px] border-r-[6px] bg-black p-2 shadow-[0_25px_50px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.05)] transition-all ease-out"
                  style={{
                    transitionDuration: isHovered ? '50ms' : '500ms', // Rápido no mouse, suave ao soltar
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovered ? 1.05 : 1})`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Reflexo brilhante interno para efeito de vidro/acrílico realista */}
                  <div 
                    className="pointer-events-none absolute inset-0 z-20 rounded-[10px] bg-gradient-to-br from-white/10 via-white/5 to-transparent transition-transform duration-300"
                    style={{ transform: 'translateZ(10px)' }} 
                  />
                  
                  <img
                    src={logoImage}
                    alt="LocSystem Logo"
                    className="relative z-10 h-full w-full scale-[1.25] object-contain drop-shadow-[0_20px_15px_rgba(0,0,0,0.8)] transition-transform duration-300"
                    style={{ transform: isHovered ? 'translateZ(30px) scale(1.25)' : 'translateZ(0px) scale(1.25)' }}
                    loading="eager"
                  />
                </div>
              </div>
            </div>
            <p
              className="mb-3 text-lg font-semibold text-white drop-shadow-2xl"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              Seja bem-vindo ao painel administrativo 2.0
            </p>
            <p
              className="text-sm font-medium italic text-gray-300"
              style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
            >
              &ldquo;Seu aliado inteligente nas retomadas.&rdquo;
            </p>
          </header>
        )}
        <Card className="mx-auto w-full max-w-lg border-white/20 bg-black/40 p-8 shadow-2xl backdrop-blur-lg">
          {children}
        </Card>
      </main>
    </div>
  );
}
