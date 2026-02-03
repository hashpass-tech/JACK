
/// <reference types="@react-three/fiber" />
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles, useTexture, MeshDistortMaterial, Image } from '@react-three/drei';
import * as THREE from 'three';
import jackUrl from '@/apps/landing/public/Jack.png';

const Scene3Dv2: React.FC = () => {
    const innerRingRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Group>(null);
    const particleRef = useRef<THREE.Group>(null);
    const groupRef = useRef<THREE.Group>(null);

    // Load texture with fallback handling
    const texture = useTexture(jackUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const { x, y } = state.mouse;

        // Subtle tilt effect based on mouse
        if (groupRef.current) {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.1, 0.1);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.1, 0.1);
        }

        // Rotate rings
        if (innerRingRef.current) {
            innerRingRef.current.rotation.z = time * 0.1;
            innerRingRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
        }
        if (outerRingRef.current) {
            outerRingRef.current.rotation.y = time * 0.05;
            outerRingRef.current.rotation.z = Math.cos(time * 0.1) * 0.05;
        }

        // Pulse particles
        if (particleRef.current) {
            particleRef.current.rotation.y = -time * 0.1;
        }
    });

    return (
        <group ref={groupRef} position={[0, -0.5, 0]}>
            {/* 
        The "Jack" Hero - Clean version
      */}
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
                <Image
                    url={jackUrl}
                    scale={[4.8, 4.8]}
                    transparent
                    position={[0, 0.5, 0]}
                    side={THREE.DoubleSide}
                />
            </Float>

            {/* 
        The "Compass" - Upgraded to look more 'real' / sci-fi.
      */}
            <group position={[0, 0.5, -0.5]}>
                {/* Inner Golden Ring */}
                <mesh ref={innerRingRef}>
                    <torusGeometry args={[2.8, 0.03, 32, 100]} />
                    <meshStandardMaterial
                        color="#F2B94B"
                        emissive="#F2B94B"
                        emissiveIntensity={1.5}
                        roughness={0.1}
                        metalness={1}
                    />
                </mesh>

                {/* Outer Tech Ring Group */}
                <group ref={outerRingRef} rotation={[Math.PI / 2.5, 0, 0]}>
                    <mesh>
                        <torusGeometry args={[3.5, 0.06, 32, 100]} />
                        <meshStandardMaterial
                            color="#38BDF8"
                            emissive="#38BDF8"
                            emissiveIntensity={0.8}
                            metalness={0.9}
                            roughness={0.1}
                        />
                    </mesh>
                    {/* Decorative ticks */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]} position={[0, 3.5, 0]}>
                            <boxGeometry args={[0.3, 0.15, 0.1]} />
                            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
                        </mesh>
                    ))}
                </group>

                {/* Environmental Sparks */}
                <group ref={particleRef}>
                    <Sparkles
                        count={100}
                        scale={8}
                        size={3}
                        speed={0.3}
                        opacity={0.7}
                        color="#F2B94B"
                    />
                    <Sparkles
                        count={50}
                        scale={10}
                        size={5}
                        speed={0.1}
                        opacity={0.4}
                        color="#38BDF8"
                    />
                </group>
            </group>
        </group>
    );
};

export default Scene3Dv2;
