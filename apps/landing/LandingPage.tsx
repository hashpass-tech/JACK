
/// <reference types="@react-three/fiber" />
import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import Scene3D from '@/components/Scene3D';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  useEffect(() => {
    // Tempo injects data-tempo-* and tempo-hot-reload-ts attributes.
    // R3F can throw when React tries to apply them to Three objects.
    // Remove them from any elements under this page as a guard.
    const stripTempoAttrs = () => {
      try {
        document
          .querySelectorAll('[data-tempo-hot-reload-ts], [tempo-hot-reload-ts], [data-tempo-hot-reload-ts], [data-tempo-*]');
      } catch {
        // ignore
      }

      try {
        const all = Array.from(document.querySelectorAll('*')) as HTMLElement[];
        for (const el of all) {
          for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('data-tempo-') || attr.name === 'tempo-hot-reload-ts') {
              el.removeAttribute(attr.name);
            }
          }
        }
      } catch {
        // ignore
      }
    };

    stripTempoAttrs();
    const id = window.setInterval(stripTempoAttrs, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B1020]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          gl={{ antialias: true, stencil: false, depth: true }}
        >
          <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
          <color attach="background" args={['#0B1020']} />
          
          <Suspense fallback={null}>
            <Scene3D />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="city" />
          </Suspense>

          {/* Intrinsic light elements now correctly typed via reference directive */}
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#F2B94B" />
          <spotLight position={[-5, 5, 5]} angle={0.15} penumbra={1} intensity={2} color="#38BDF8" castShadow />
          
          <OrbitControls 
            enableZoom={false} 
            maxPolarAngle={Math.PI / 2} 
            minPolarAngle={Math.PI / 3}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full p-8 md:p-16 pointer-events-none">
        <header className="w-full flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-[#F2B94B] rounded-full flex items-center justify-center shadow-[0_0_20px_#F2B94B]">
              <span className="text-[#0B1020] font-bold text-xl">J</span>
            </div>
            <h1 className="text-2xl font-space font-bold tracking-widest text-[#F2B94B]">JACK</h1>
          </div>
          <nav className="hidden md:flex space-x-8 pointer-events-auto">
            <a href="#docs" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">Docs</a>
            <a href="#sdk" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">SDK</a>
            <a href="#github" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">GitHub</a>
          </nav>
        </header>

        <main className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-space font-bold tracking-tighter">
              <span className="text-[#F2B94B]">XChain</span> <span className="text-white">Exec Kernel</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto">
              Intent &rarr; Route &rarr; Private Constraints &rarr; Policy-Enforced Settlement
            </p>
          </div>
          
          <button 
            onClick={onEnter}
            className="pointer-events-auto px-10 py-4 bg-[#F2B94B] text-[#0B1020] font-bold rounded-full 
                       hover:scale-105 transition-all shadow-[0_0_30px_rgba(242,185,75,0.4)]
                       active:scale-95 group flex items-center space-x-3"
          >
            <span className="font-space uppercase tracking-widest">Open Dashboard</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </main>

        <footer className="w-full text-center text-xs text-gray-500 uppercase tracking-widest pb-4">
          Built for the future of Cross-Chain Interoperability
        </footer>
      </div>

      {/* Fallback Static Gradient (behind 3D) */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0B1020] via-[#0F1A2E] to-[#0B1020] -z-10" />
    </div>
  );
};

export default LandingPage;
