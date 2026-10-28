import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CanvasTexture, Color, InstancedMesh, Object3D, SRGBColorSpace } from 'three';
import type { World } from '@chorusborn/contracts';

type StoneInstance = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
  rotation?: number;
};
function Stones({
  items,
  shadow = true,
  kind = 'stone',
}: {
  items: StoneInstance[];
  shadow?: boolean;
  kind?: 'stone' | 'rock' | 'leaf';
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#f4f0e8';
    context.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 420; i++) {
      const n = ((Math.imul(i + 11, 73856093) >>> 0) % 997) / 997;
      context.fillStyle = `rgba(76,64,48,${0.025 + n * 0.08})`;
      context.fillRect((i * 31) % 64, (i * 47) % 64, 1 + n * 2, 1);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );
  useLayoutEffect(() => {
    const object = new Object3D(),
      color = new Color();
    items.forEach((item, i) => {
      object.position.set(item.x, item.y, item.z);
      object.scale.set(item.sx, item.sy, item.sz);
      object.rotation.set(0, item.rotation ?? 0, 0);
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
      mesh.current!.setColorAt(i, color.set(item.color));
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor) mesh.current!.instanceColor.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      castShadow={shadow}
      receiveShadow
    >
      {kind === 'stone' ? (
        <primitive object={geometry} attach="geometry" />
      ) : kind === 'rock' ? (
        <icosahedronGeometry args={[0.64, 0]} />
      ) : (
        <sphereGeometry args={[0.55, 5, 4]} />
      )}
      <meshLambertMaterial map={kind === 'stone' ? texture : null} />
    </instancedMesh>
  );
}
const noise = (x: number, z: number) =>
  (((Math.imul(x + 91, 73856093) ^ Math.imul(z + 17, 19349663)) >>> 0) % 1000) / 1000;

export function Garden({ world }: { world: World }) {
  const width = world.arena.width,
    height = world.arena.height;
  const terrain = useMemo(() => {
    const palette = ['#b7aa8b', '#c7b99b', '#ae9e80', '#d0c0a1', '#b5a584', '#c2b292'];
    const floor: StoneInstance[] = [],
      trim: StoneInstance[] = [],
      moss: StoneInstance[] = [];
    for (let x = 0; x < width; x++)
      for (let z = 0; z < height; z++) {
        const n = noise(x, z);
        floor.push({
          x: x + 0.5,
          y: -0.19 - n * 0.025,
          z: z + 0.5,
          sx: 0.965,
          sy: 0.35,
          sz: 0.965,
          color: palette[Math.floor(n * palette.length)]!,
        });
        // Surface chips are shallow, never obstacles or alternate routes.
        if (n > 0.84)
          trim.push({
            x: x + 0.18,
            y: -0.006,
            z: z + 0.28,
            sx: 0.27,
            sy: 0.012,
            sz: 0.025,
            color: '#8e846d',
            rotation: n,
          });
      }
    for (let i = -1; i <= width; i++)
      for (const z of [-0.65, height + 0.65]) {
        trim.push({
          x: i + 0.5,
          y: -0.08,
          z,
          sx: 0.96,
          sy: 0.52,
          sz: 0.78,
          color: i % 3 ? '#908971' : '#b6a98b',
        });
        if (i % 3 === 0)
          moss.push({ x: i + 0.4, y: 0.21, z, sx: 0.65, sy: 0.045, sz: 0.5, color: '#68774a' });
      }
    for (let z = 0; z < height; z++)
      for (const x of [-0.65, width + 0.65]) {
        trim.push({
          x,
          y: -0.08,
          z: z + 0.5,
          sx: 0.78,
          sy: 0.52,
          sz: 0.96,
          color: z % 3 ? '#908971' : '#b6a98b',
        });
      }
    return { floor, trim, moss };
  }, [width, height]);
  const wallKey = world.arena.walls.map((p) => `${p.x},${p.y}`).join(';');
  const walls = useMemo(() => {
    const blocks: StoneInstance[] = [],
      caps: StoneInstance[] = [],
      moss: StoneInstance[] = [];
    for (const p of world.arena.walls) {
      const n = noise(p.x, p.y);
      blocks.push({
        x: p.x + 0.5,
        y: 0.43,
        z: p.y + 0.5,
        sx: 0.96,
        sy: 0.86,
        sz: 0.96,
        color: n > 0.5 ? '#8f8d75' : '#aaa58a',
      });
      caps.push({ x: p.x + 0.5, y: 0.95, z: p.y + 0.5, sx: 1, sy: 0.18, sz: 1, color: '#c6b899' });
      if (n > 0.45)
        moss.push({
          x: p.x + 0.6,
          y: 1.05,
          z: p.y + 0.64,
          sx: 0.67,
          sy: 0.035,
          sz: 0.53,
          color: '#637748',
        });
    }
    return { blocks, caps, moss };
    // A stable geometry key avoids rebuilding instancing for every simulation update.
  }, [wallKey]);
  return (
    <group>
      <mesh position={[width / 2, -0.75, height / 2]} receiveShadow>
        <boxGeometry args={[width + 2.1, 1.2, height + 2.1]} />
        <meshLambertMaterial color="#5e6758" />
      </mesh>
      <mesh position={[width / 2, -1.25, height / 2]}>
        <boxGeometry args={[width + 1.3, 0.45, height + 1.3]} />
        <meshLambertMaterial color="#333e3b" />
      </mesh>
      <Stones items={terrain.floor} shadow={false} />
      <Stones items={terrain.trim} />
      <Stones items={terrain.moss} shadow={false} />
      <Stones items={walls.blocks} />
      <Stones items={walls.caps} />
      <Stones items={walls.moss} shadow={false} />
      <mesh
        position={[world.arena.coreSpawn.x / 1000, 0.012, world.arena.coreSpawn.y / 1000]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.88, 1.96, 48]} />
        <meshLambertMaterial color="#887b64" />
      </mesh>
      <mesh
        position={[world.arena.coreSpawn.x / 1000, 0.016, world.arena.coreSpawn.y / 1000]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
      >
        <ringGeometry args={[0.72, 0.81, 4]} />
        <meshLambertMaterial color="#8e8168" />
      </mesh>
      <mesh position={[16.5, -1.7, 9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshBasicMaterial color="#223b3d" />
      </mesh>
      <EdgeGarden width={width} height={height} />
    </group>
  );
}

function EdgeGarden({ width, height }: { width: number; height: number }) {
  const props = useMemo(() => {
    const rocks: StoneInstance[] = [],
      leaves: StoneInstance[] = [];
    for (let i = 0; i < 52; i++) {
      const side = i % 4,
        n = noise(i, 3),
        along = noise(i, 5);
      const x = side < 2 ? along * (width + 4) - 2 : side === 2 ? -1.8 : width + 1.8;
      const z = side >= 2 ? along * (height + 4) - 2 : side === 0 ? -1.8 : height + 1.8;
      // Gate sightlines stay open; none of these props enters the playable rectangle.
      if (side >= 2 && Math.abs(z - 9.5) < 3.3) continue;
      rocks.push({
        x,
        y: -0.45 + n * 0.2,
        z,
        sx: 0.6 + n * 0.6,
        sy: 0.5 + n * 0.5,
        sz: 0.6 + n * 0.6,
        color: n > 0.5 ? '#6a7961' : '#899078',
        rotation: n,
      });
      for (let j = 0; j < 3; j++)
        leaves.push({
          x: x + (j - 1) * 0.22,
          y: 0.05 + n * 0.25,
          z,
          sx: 0.16,
          sy: 0.4 + n * 0.4,
          sz: 0.28,
          color: j % 2 ? '#5a7548' : '#7d9458',
          rotation: j * 0.8 + n,
        });
    }
    return { rocks, leaves };
  }, [width, height]);
  return (
    <>
      <Stones items={props.rocks} kind="rock" />
      <Stones items={props.leaves} kind="leaf" />
    </>
  );
}

export function HomeGate({
  x,
  z,
  team,
  active,
}: {
  x: number;
  z: number;
  team: 'a' | 'b';
  active: boolean;
}) {
  const color = team === 'a' ? '#ad85eb' : '#efb458';
  return (
    <group position={[x, 0, z]}>
      {/* The pad marks the actual Manhattan capture radius, not a larger art-only goal. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.75, 4]} />
        <meshLambertMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.6 : 0.16}
          transparent
          opacity={0.65}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.6, 1.7, 48]} />
        <meshLambertMaterial color={color} transparent opacity={0.4} />
      </mesh>
      {/* Monument sits beyond the legal edge, facing across the field. */}
      <group position={[team === 'a' ? -3.65 : 3.65, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 1.7, 0, 0]}>
            <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 3.1, 1.15]} />
              <meshLambertMaterial color="#a79e82" />
            </mesh>
            <mesh position={[0, 3.18, 0]} castShadow>
              <boxGeometry args={[1.15, 0.35, 1.4]} />
              <meshLambertMaterial color="#d4c4a1" />
            </mesh>
            {[0.65, 1.4, 2.2].map((y) => (
              <mesh key={y} position={[0, y, 0.59]}>
                <boxGeometry args={[0.65, 0.035, 0.025]} />
                <meshLambertMaterial color="#6c725d" />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 3.3, 0]} castShadow>
          <boxGeometry args={[4.3, 0.65, 1.1]} />
          <meshLambertMaterial color="#bdb08e" />
        </mesh>
        <mesh position={[0, 3.9, 0.1]} rotation={[0, 0, team === 'a' ? Math.PI / 4 : 0]}>
          <boxGeometry args={[0.7, 0.7, 0.4]} />
          <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.45} />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <planeGeometry args={[2.45, 2.75]} />
          <meshBasicMaterial color={color} transparent opacity={0.19} side={2} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 1.18, 1.6, 0.06]}>
            <boxGeometry args={[0.09, 2.7, 0.12]} />
            <meshLambertMaterial color={color} emissive={color} emissiveIntensity={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function HazardTiles({ world }: { world: World }) {
  const active = (world.tick + (world.seed % 120)) % 120 < 60;
  return (
    <group>
      {world.arena.hazards.map((p) => (
        <group key={`${p.x}-${p.y}`} position={[p.x + 0.5, 0.035, p.y + 0.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.93, 0.93, 0.055]} />
            <meshLambertMaterial color={active ? '#9b4b2f' : '#6d6552'} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.19, 0.25, 4]} />
            <meshLambertMaterial
              color={active ? '#ffc177' : '#b49a6e'}
              emissive="#dd642c"
              emissiveIntensity={active ? 0.7 : 0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
