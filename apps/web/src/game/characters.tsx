import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ActorId } from '@chorusborn/contracts';

export type RigMotion = {
  moving: number;
  carrying: boolean;
  defeated: boolean;
  hit: number;
  celebrating: boolean;
  motion: boolean;
};
export const TEAM = { a: '#a27ce6', b: '#e4a348' };
type Triple = [number, number, number];
type Piece = {
  geometry: BufferGeometry;
  color: string;
  position?: Triple;
  scale?: Triple;
  rotation?: Triple;
};
const stone = (color: string, scale: Triple, position: Triple = [0, 0, 0], detail = 1): Piece => ({
  geometry: new IcosahedronGeometry(1, detail),
  color,
  scale,
  position,
});
const fin = (color: string, position: Triple, scale: Triple, rotation: Triple): Piece => ({
  geometry: new ConeGeometry(0.4, 1.5, 4),
  color,
  position,
  scale,
  rotation,
});
const box = (
  color: string,
  scale: Triple,
  position: Triple,
  rotation: Triple = [0, 0, 0],
): Piece => ({ geometry: new BoxGeometry(1, 1, 1), color, scale, position, rotation });
const sphere = (color: string, scale: Triple, position: Triple): Piece => ({
  geometry: new SphereGeometry(1, 12, 8),
  color,
  scale,
  position,
});

// Bake static pieces into one draw call per moving joint. Vertex colors retain the
// original palette without a material group (and draw call) for every small part.
function bake(pieces: Piece[]) {
  const geometries = pieces.map(
    ({ geometry, color, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0] }) => {
      const result = geometry.index ? geometry.toNonIndexed() : geometry;
      if (result !== geometry) geometry.dispose();
      const tint = new Color(color),
        values = new Float32Array(result.getAttribute('position').count * 3);
      for (let i = 0; i < values.length; i += 3) {
        values[i] = tint.r;
        values[i + 1] = tint.g;
        values[i + 2] = tint.b;
      }
      result.setAttribute('color', new Float32BufferAttribute(values, 3));
      result.applyMatrix4(
        new Matrix4().compose(
          new Vector3(...position),
          new Quaternion().setFromEuler(new Euler(...rotation)),
          new Vector3(...scale),
        ),
      );
      return result;
    },
  );
  const merged = mergeGeometries(geometries)!;
  geometries.forEach((g) => g.dispose());
  return merged;
}
function buildRig(team: ActorId) {
  const violet = team === 'a',
    color = TEAM[team],
    dark = violet ? '#69528d' : '#aa7135';
  const torso = [
    stone(color, violet ? [0.64, 0.76, 0.48] : [0.77, 0.74, 0.56], [0, 0.96, 0]),
    stone(violet ? '#ded5b8' : '#d7bc88', [0.43, 0.48, 0.16], [0, 0.95, 0.39]),
    stone(dark, [0.17, 0.2, 0.07], [0, 1.16, 0.53], 0),
  ];
  if (violet)
    torso.push({
      geometry: new TorusGeometry(0.54, 0.12, 6, 12),
      color: '#6d365c',
      position: [0, 1.5, 0.02],
      rotation: [Math.PI / 2, 0, 0],
      scale: [1, 0.8, 1],
    });
  else
    for (const side of [-1, 1])
      torso.push(stone('#efd091', [0.43, 0.34, 0.4], [side * 0.75, 1.45, 0.02], 0));
  const head = [
    stone(color, violet ? [0.77, 0.72, 0.61] : [0.85, 0.69, 0.65], [0, 0, 0], 2),
    stone('#f1e5c7', [0.65, 0.53, 0.22], [0, -0.08, 0.49], 2),
    stone('#443142', [0.08, 0.065, 0.06], [0, -0.22, 0.74]),
    box(dark, [0.17, 0.17, 0.06], [0, 0.35, 0.58], [0, 0, Math.PI / 4]),
    {
      geometry: new TorusGeometry(0.1, 0.023, 5, 12, Math.PI),
      color: '#6d4b44',
      position: [0, -0.35, 0.68] as Triple,
      rotation: [0, 0, Math.PI] as Triple,
    },
  ];
  if (violet)
    head.push(
      fin(color, [-0.51, 0.88, -0.08], [0.76, 1.12, 0.4], [0.08, 0, 0.38]),
      fin(dark, [0.49, 0.8, -0.12], [0.8, 0.95, 0.42], [-0.12, 0, -0.27]),
      fin('#d4beec', [-0.55, 0.9, 0.05], [0.36, 0.71, 0.12], [0.08, 0, 0.38]),
      fin('#d4beec', [0.53, 0.82, 0.01], [0.36, 0.6, 0.12], [-0.12, 0, -0.27]),
    );
  else
    head.push(
      fin('#f1d49d', [-0.66, 0.42, -0.08], [0.9, 0.57, 0.8], [0, 0, 0.9]),
      fin('#f1d49d', [0.66, 0.42, -0.08], [0.9, 0.57, 0.8], [0, 0, -0.9]),
      stone('#e7bf72', [0.33, 0.29, 0.5], [0, 0.52, -0.08], 0),
    );
  const eyes: Piece[] = [];
  for (const side of [-1, 1]) {
    eyes.push(
      sphere('#241c31', [0.19, 0.245, 0.085], [side * 0.28, 0, 0]),
      sphere(
        violet ? '#715598' : '#99602c',
        [0.105, 0.16, 0.04],
        [side * 0.28 + 0.025, 0.015, 0.06],
      ),
      sphere('#ffffff', [0.045, 0.058, 0.025], [side * 0.28 - 0.025, 0.085, 0.091]),
    );
    if (!violet)
      eyes.push(box(dark, [0.36, 0.09, 0.13], [side * 0.28, 0.22, 0.01], [0, 0, side * 0.2]));
  }
  const mantle = violet
    ? [
        box('#86456d', [0.36, 0.9, 0.07], [0.1, -0.38, -0.22], [-0.4, 0, -0.15]),
        box('#a65b80', [0.25, 0.65, 0.07], [0.27, -0.68, -0.4], [-0.65, 0, -0.3]),
      ]
    : [
        stone('#a77c47', [0.82, 0.79, 0.28], [0, 1.22, -0.38], 0),
        ...[-1, 0, 1].map((i) =>
          stone(i === 0 ? '#ccab6d' : '#b08e50', [0.25, 0.62, 0.15], [i * 0.36, 1.26, -0.6], 0),
        ),
      ];
  return {
    torso: bake(torso),
    head: bake(head),
    face: bake(eyes),
    scarf: bake(mantle),
    foot: bake([
      stone(dark, [0.39, 0.3, 0.55]),
      stone('#ede0b8', [0.29, 0.16, 0.22], [0, 0.02, 0.35]),
    ]),
    arm: bake([
      stone(color, [0.26, 0.5, 0.3], [0, -0.25, 0]),
      stone(dark, [0.3, 0.25, 0.32], [0, -0.61, 0.1]),
    ]),
  };
}
export function ChampionModel({
  team,
  motion,
  ghost = false,
}: {
  team: ActorId;
  motion?: React.RefObject<RigMotion>;
  ghost?: boolean;
}) {
  const body = useRef<Group>(null),
    head = useRef<Group>(null),
    leftArm = useRef<Group>(null),
    rightArm = useRef<Group>(null);
  const leftFoot = useRef<Group>(null),
    rightFoot = useRef<Group>(null),
    scarf = useRef<Group>(null),
    face = useRef<Group>(null),
    phase = useRef(0);
  const rig = useMemo(() => buildRig(team), [team]);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);
  useEffect(
    () => () => {
      Object.values(rig).forEach((g) => g.dispose());
      material.dispose();
    },
    [rig, material],
  );
  const violet = team === 'a';
  useFrame((_, delta) => {
    const m = motion?.current;
    if (!m || !body.current || !head.current) return;
    const animate = m.motion && !m.defeated;
    phase.current += animate ? Math.min(delta, 0.04) * (m.moving > 0.01 ? 11 : 2) : 0;
    const stride = animate ? Math.sin(phase.current) * m.moving : 0;
    const breath = animate ? Math.sin(phase.current) * 0.025 : 0;
    body.current.position.y =
      0.08 +
      Math.abs(stride) * 0.1 +
      breath +
      (m.celebrating && animate ? Math.abs(Math.sin(phase.current * 1.2)) * 0.3 : 0);
    body.current.rotation.z = animate ? stride * 0.05 : 0;
    head.current.rotation.x = animate
      ? m.carrying
        ? -0.08
        : Math.sin(phase.current * 0.7) * 0.025
      : 0;
    head.current.rotation.z = animate ? Math.sin(phase.current * 0.45) * 0.035 : 0;
    leftArm.current!.rotation.x = m.carrying ? -0.85 : stride * 0.65;
    rightArm.current!.rotation.x = m.carrying ? -0.85 : -stride * 0.65;
    leftFoot.current!.rotation.x = -stride * 0.55;
    rightFoot.current!.rotation.x = stride * 0.55;
    scarf.current!.rotation.x = animate ? -0.18 - Math.abs(stride) * 0.25 : 0;
    scarf.current!.rotation.z = animate ? Math.sin(phase.current) * 0.12 : 0;
    face.current!.scale.y = animate && Math.sin(phase.current * 0.16) > 0.995 ? 0.16 : 1;
    body.current.scale.setScalar(m.defeated ? 0.7 : 1);
    body.current.rotation.x = m.defeated ? -0.9 : m.hit > 0 ? -0.12 : 0;
  });
  return (
    <group scale={ghost ? 1 : 1.12} dispose={null}>
      <group ref={body}>
        <mesh geometry={rig.torso} material={material} castShadow receiveShadow />
        <group ref={leftFoot} position={[-0.44, 0.28, 0.1]}>
          <mesh geometry={rig.foot} material={material} castShadow />
        </group>
        <group ref={rightFoot} position={[0.44, 0.28, 0.1]}>
          <mesh geometry={rig.foot} material={material} castShadow />
        </group>
        <group ref={leftArm} position={[-0.68, 1.16, 0.02]}>
          <mesh geometry={rig.arm} material={material} castShadow />
        </group>
        <group ref={rightArm} position={[0.68, 1.16, 0.02]}>
          <mesh geometry={rig.arm} material={material} castShadow />
        </group>
        <group ref={scarf} position={violet ? [0.15, 1.45, -0.35] : [0, 0, 0]}>
          <mesh geometry={rig.scarf} material={material} castShadow />
        </group>
        <group ref={head} position={[0, 1.92, 0.06]}>
          <mesh geometry={rig.head} material={material} castShadow receiveShadow />
          <group ref={face} position={[0, 0.01, 0.69]}>
            <mesh geometry={rig.face} material={material} />
          </group>
        </group>
      </group>
    </group>
  );
}

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
