import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export const TEAM = { a: '#a27ce6', b: '#e4a348' };

export function CoreGem({ small = false, motion = true }: { small?: boolean; motion?: boolean }) {
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (root.current && motion) root.current.rotation.y = clock.elapsedTime * 0.8;
  });
  return (
    <group ref={root} scale={small ? 0.75 : 1}>
      <mesh castShadow>
        <octahedronGeometry args={[0.49, 0]} />
        <meshStandardMaterial
          color="#d4f48b"
          emissive="#9dbb3f"
          emissiveIntensity={0.65}
          roughness={0.22}
          metalness={0.25}
        />
      </mesh>
      <mesh scale={1.18}>
        <octahedronGeometry args={[0.49, 0]} />
        <meshBasicMaterial color="#e1ffb6" wireframe transparent opacity={0.42} />
      </mesh>
    </group>
  );
}
