
/// <reference types="@react-three/fiber" />
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshWobbleMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const Scene3D: React.FC = () => {
  const compassRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (compassRef.current) {
      compassRef.current.rotation.y = Math.sin(time * 0.2) * 0.3;
      compassRef.current.rotation.z = Math.cos(time * 0.3) * 0.1;
    }
    if (routeRef.current) {
      routeRef.current.rotation.y = time * 0.1;
    }
  });

  return (
    <>
      {/* Lukas Stylized Hero (Captain) */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* All lowercase Three.js tags are now correctly recognized by TS via the reference directive */}
        <group position={[0, -0.5, 2]}>
          {/* Lukas body */}
          <mesh position={[0, 0, 0]} castShadow>
            <capsuleGeometry args={[0.4, 1, 4, 8]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Lukas head */}
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          {/* Hands holding the core */}
          <mesh position={[0.5, 0.4, 0.5]}>
            <boxGeometry args={[0.1, 0.1, 0.3]} />
            <meshStandardMaterial color="#F2B94B" emissive="#F2B94B" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-0.5, 0.4, 0.5]}>
            <boxGeometry args={[0.1, 0.1, 0.3]} />
            <meshStandardMaterial color="#F2B94B" emissive="#F2B94B" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </Float>

      {/* Glowing Compass Core */}
      <group ref={compassRef} position={[0, 0, 0]}>
        <Float speed={5} rotationIntensity={2} floatIntensity={2}>
          {/* Outer Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.5, 0.05, 16, 100]} />
            <meshStandardMaterial color="#F2B94B" emissive="#F2B94B" emissiveIntensity={2} />
          </mesh>
          {/* Inner Compass Spokes */}
          {[0, 45, 90, 135].map((angle, i) => (
            <mesh key={i} rotation={[0, 0, (angle * Math.PI) / 180]}>
              <boxGeometry args={[4.5, 0.1, 0.1]} />
              <meshStandardMaterial color="#F2B94B" emissive="#F2B94B" emissiveIntensity={1.5} />
            </mesh>
          ))}
          {/* Central Sphere */}
          <mesh>
            <sphereGeometry args={[0.6, 32, 32]} />
            <MeshWobbleMaterial color="#F2B94B" factor={0.6} speed={2} emissive="#F2B94B" emissiveIntensity={5} />
          </mesh>
          <Sparkles count={50} scale={4} size={6} speed={0.4} color="#F2B94B" />
        </Float>
      </group>

      {/* Cross-chain Swap Routes (flowing neon beams) */}
      <group ref={routeRef}>
        {Array.from({ length: 12 }).map((_, i) => {
          const radius = 6 + Math.random() * 2;
          const speed = 0.5 + Math.random();
          return (
            <Beam key={i} radius={radius} speed={speed} color={i % 2 === 0 ? "#38BDF8" : "#F2B94B"} />
          );
        })}
      </group>
    </>
  );
};

const Beam: React.FC<{ radius: number; speed: number; color: string }> = ({ radius, speed, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.x = Math.sin(time * speed) * radius;
      meshRef.current.position.z = Math.cos(time * speed) * radius;
      meshRef.current.position.y = Math.sin(time * 0.5) * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} />
    </mesh>
  );
};

export default Scene3D;
