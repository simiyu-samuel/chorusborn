import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, MathUtils, Mesh, OrthographicCamera, Vector3 } from 'three';
import type { ActorId, World } from '@chorusborn/contracts';
import { CoreGem, TEAM } from './characters.js';
import { FighterRig } from './fighter-rig.js';
import { liveFighterPose, matchStrike } from './combat-motion.js';
import { Garden, HazardTiles, HomeGate } from './scenery.js';
import { actorPosition, canInterpolate, recentEvents } from './presentation.js';

type SceneProps = {
  world: World;
  animate: boolean;
  reducedMotion: boolean;
  lowEffects: boolean;
  markers: RefObject<(HTMLDivElement | null)[]>;
  onReady: () => void;
  onUnavailable: () => void;
};
function CameraRig() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as OrthographicCamera,
      aspect = size.width / Math.max(1, size.height);
    const visibleHeight = Math.max(28, 46 / aspect);
    cam.left = (-visibleHeight * aspect) / 2;
    cam.right = (visibleHeight * aspect) / 2;
    cam.top = visibleHeight / 2;
    cam.bottom = -visibleHeight / 2;
    cam.position.set(38, 35, 42);
    cam.lookAt(16, 0, 9);
    cam.updateProjectionMatrix();
    // HTML labels project before Three renders the first demand frame.
    cam.updateMatrixWorld(true);
  }, [camera, size.width, size.height]);
  return null;
}
function RenderReady({ ready }: { ready: () => void }) {
  const complete = useRef(false);
  useFrame(() => {
    if (!complete.current) {
      complete.current = true;
      ready();
    }
  });
  return null;
}
function Actor({
  index,
  world,
  animate,
  reducedMotion,
  markers,
}: {
  index: 0 | 1;
  world: World;
  animate: boolean;
  reducedMotion: boolean;
  markers: SceneProps['markers'];
}) {
  const root = useRef<Group>(null),
    facing = useRef<Group>(null),
    shield = useRef<Mesh>(null),
    shadow = useRef<Mesh>(null);
  const actor = world.champions[index],
    previousWorld = useRef(world);
  const transition = useRef({ from: actor, to: actor, started: 0, interpolate: false });
  const frame = useRef({ x: actor.x / 1000, z: actor.y / 1000 });
  const previousFrame = useRef({ x: actor.x / 1000, z: actor.y / 1000 });
  const angle = useRef(index === 0 ? -0.4 : -0.7),
    phase = useRef(0);
  const pose = useRef(liveFighterPose(world, actor.id));
  const projection = useMemo(() => new Vector3(), []);
  useLayoutEffect(() => {
    const continuous =
      animate &&
      !reducedMotion &&
      world.status === 'running' &&
      canInterpolate(previousWorld.current, world);
    transition.current = {
      from: continuous ? { ...actor, x: frame.current.x * 1000, y: frame.current.z * 1000 } : actor,
      to: actor,
      started: performance.now(),
      interpolate: continuous,
    };
    previousWorld.current = world;
  }, [world, actor, animate, reducedMotion]);
  useFrame(({ camera, size }, delta) => {
    if (!root.current || !facing.current) return;
    const t = transition.current;
    const progress = t.interpolate ? Math.min(1, (performance.now() - t.started) / 100) : 1;
    const p = actorPosition(t.from, t.to, progress);
    const dx = p.x - previousFrame.current.x,
      dz = p.z - previousFrame.current.z;
    const moving = Math.min(1, Math.hypot(dx, dz) / Math.max(0.001, delta) / 5);
    const contact = matchStrike(world, actor.id);
    if (contact?.type === 'strike')
      angle.current = Math.atan2(contact.to.x - contact.from.x, contact.to.y - contact.from.y);
    else if (moving > 0.04) angle.current = Math.atan2(dx, dz);
    const motion = animate && !reducedMotion && world.status === 'running';
    phase.current += motion ? delta : 0;
    const sampledTick =
      world.tick + (motion ? Math.min(2, (performance.now() - t.started) / 50) : 0);
    const travelled = Math.abs(t.to.x - t.from.x) + Math.abs(t.to.y - t.from.y);
    pose.current = liveFighterPose(
      world,
      actor.id,
      sampledTick,
      motion && t.interpolate ? Math.min(1, travelled / 500) : 0,
      reducedMotion,
    );
    root.current.position.set(p.x, actor.health <= 0 ? -0.15 : 0, p.z);
    // Smooth orientation only, never movement beyond received positions.
    if (motion)
      facing.current.rotation.y +=
        (MathUtils.euclideanModulo(
          angle.current - facing.current.rotation.y + Math.PI,
          Math.PI * 2,
        ) -
          Math.PI) *
        Math.min(1, delta * 14);
    else facing.current.rotation.y = angle.current;
    root.current.visible = actor.health > 0 || world.tick - actor.lastDamageAt < 10;
    if (shield.current) {
      shield.current.visible = actor.shieldUntil > world.tick;
      const pulse = motion ? 1 + Math.sin(phase.current * 3) * 0.025 : 1;
      shield.current.scale.set(pulse, pulse * 1.6, pulse);
    }
    if (shadow.current) shadow.current.scale.setScalar(actor.health > 0 ? 1 : 0.6);
    projection.set(p.x, 4.9, p.z).project(camera);
    const marker = markers.current[index];
    if (marker) {
      marker.style.transform = `translate(${(projection.x * 0.5 + 0.5) * size.width}px,${(-projection.y * 0.5 + 0.5) * size.height}px) translate(-50%,-100%)`;
      marker.style.opacity = actor.health > 0 ? '1' : '.55';
      marker.dataset.pose = pose.current.move;
      marker.dataset.renderedTick = String(world.tick);
    }
    frame.current = p;
    previousFrame.current = p;
  });
  return (
    <group ref={root} position={[actor.x / 1000, 0, actor.y / 1000]}>
      <mesh ref={shadow} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 24]} />
        <meshBasicMaterial color="#24312c" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 0.9, index === 0 ? 4 : 6]} />
        <meshBasicMaterial color={TEAM[actor.id]} transparent opacity={0.85} />
      </mesh>
      <group ref={facing} rotation={[0, index === 0 ? -0.4 : -0.7, 0]}>
        <group scale={1.2}>
          <FighterRig team={actor.id} samplePose={() => pose.current} />
        </group>
        {world.core.carrier === actor.id && actor.health > 0 ? (
          <group position={[0, 1.9, 0.9]}>
            <CoreGem small motion={animate && !reducedMotion && world.status === 'running'} />
          </group>
        ) : null}
      </group>
      <mesh
        ref={shield}
        position={[0, 1.8, 0]}
        scale={[1, 1.6, 1]}
        visible={actor.shieldUntil > world.tick}
      >
        <sphereGeometry args={[1.15, 20, 14]} />
        <meshStandardMaterial
          color="#8ce5ed"
          emissive="#67bfcf"
          emissiveIntensity={0.3}
          roughness={0.2}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      {world.tick >= actor.lastDamageAt && world.tick - actor.lastDamageAt < 5 ? (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#fff0cf" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}
function Core({ world, reducedMotion }: { world: World; reducedMotion: boolean }) {
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (root.current)
      root.current.position.y =
        1 +
        (!reducedMotion && world.status === 'running' ? Math.sin(clock.elapsedTime * 2) * 0.14 : 0);
  });
  if (world.core.carrier !== null) return null;
  return (
    <group position={[world.core.x / 1000, 0, world.core.y / 1000]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.67, 32]} />
        <meshBasicMaterial color="#c1e991" transparent opacity={0.6} />
      </mesh>
      <group ref={root} position={[0, 1, 0]}>
        <CoreGem motion={!reducedMotion && world.status === 'running'} />
      </group>
    </group>
  );
}
function Decoys({ world }: { world: World }) {
  return (
    <>
      {world.decoys.map((decoy, i) => (
        <group
          key={`${decoy.owner}-${decoy.expiresAt}-${i}`}
          position={[decoy.x / 1000, 0, decoy.y / 1000]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[0.65, 0.75, 6, 1, 0, Math.PI * 1.75]} />
            <meshBasicMaterial color="#86dfdf" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <icosahedronGeometry args={[0.7, 0]} />
            <meshBasicMaterial
              color="#86dfdf"
              wireframe
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 2.1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.3, 0.3, 0.08]} />
            <meshBasicMaterial color="#86dfdf" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
    </>
  );
}
function EventEffects({ world, reducedMotion }: { world: World; reducedMotion: boolean }) {
  return (
    <>
      {recentEvents(world, 18).map((event) => {
        if (event.type === 'strike') {
          if (reducedMotion || world.tick - event.tick >= 5) return null;
          const age = (world.tick - event.tick) / 5;
          return (
            <group
              key={`${event.tick}-${event.actorId}-strike`}
              position={[event.to.x / 1000, 1.8, event.to.y / 1000]}
            >
              {[0, 1, 2, 3].map((i) => (
                <mesh
                  key={i}
                  position={[
                    Math.cos((i * Math.PI) / 2) * 0.4,
                    Math.sin((i * Math.PI) / 2) * 0.4,
                    0,
                  ]}
                  rotation={[0, 0, (i * Math.PI) / 2]}
                  scale={1 + age}
                >
                  <boxGeometry args={[0.45, 0.09, 0.09]} />
                  <meshBasicMaterial
                    color={event.shielded ? '#9deaff' : '#fff0bf'}
                    transparent
                    opacity={1 - age}
                    depthWrite={false}
                  />
                </mesh>
              ))}
            </group>
          );
        }
        if (event.type !== 'capture' && event.type !== 'pickup' && event.type !== 'defeat')
          return null;
        const actor = world.champions.find((c) => c.id === event.actorId)!;
        const capture = event.type === 'capture',
          age = (world.tick - event.tick) / 18;
        const center = capture ? actor.home : actor;
        return (
          <group
            key={`${event.tick}-${event.actorId}-${event.type}`}
            position={[center.x / 1000, 0.12, center.y / 1000]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={reducedMotion ? 1 : 1 + age * 2}>
              <ringGeometry args={[capture ? 1.1 : 0.6, capture ? 1.2 : 0.7, 32]} />
              <meshBasicMaterial
                color={capture ? TEAM[actor.id] : '#d5f49a'}
                transparent
                opacity={(1 - age) * 0.75}
                depthWrite={false}
              />
            </mesh>
            {capture && !reducedMotion
              ? [0, 1, 2, 3, 4, 5].map((i) => (
                  <mesh
                    key={i}
                    position={[Math.cos(i) * 1.4, 0.4 + age * 1.8, Math.sin(i) * 1.4]}
                    rotation={[age * 3, i, age * 2]}
                  >
                    <boxGeometry args={[0.12, 0.2, 0.08]} />
                    <meshBasicMaterial
                      color={i % 2 ? TEAM[actor.id] : '#f5e9c3'}
                      transparent
                      opacity={1 - age}
                    />
                  </mesh>
                ))
              : null}
          </group>
        );
      })}
    </>
  );
}
function ObjectMarkers({ world, markers }: { world: World; markers: SceneProps['markers'] }) {
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const place = (index: number, x: number, y: number, z: number) => {
      const element = markers.current[index];
      if (!element) return;
      point.set(x, y, z).project(camera);
      element.style.transform = `translate(${(point.x * 0.5 + 0.5) * size.width}px,${(-point.y * 0.5 + 0.5) * size.height}px) translate(-50%,-50%)`;
    };
    world.champions.forEach((actor, index) =>
      place(index + 2, actor.home.x / 1000, 0.1, actor.home.y / 1000 + 1.5),
    );
    world.decoys.forEach((decoy, index) => place(index + 4, decoy.x / 1000, 2.7, decoy.y / 1000));
  });
  return null;
}
function Stage({
  world,
  animate,
  reducedMotion,
  lowEffects,
  markers,
  onReady,
}: Omit<SceneProps, 'onUnavailable'>) {
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    invalidate();
  }, [world, animate, reducedMotion, lowEffects, invalidate]);
  return (
    <>
      <color attach="background" args={['#172628']} />
      <ambientLight intensity={0.75} color="#d8d6c3" />
      <hemisphereLight args={['#e5f0eb', '#51583e', 1.4]} />
      <directionalLight
        position={[-4, 25, 15]}
        intensity={3.2}
        color="#ffe2ac"
        castShadow={!lowEffects}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={23}
        shadow-camera-bottom={-23}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0015}
        shadow-normalBias={0.08}
        onUpdate={(light) => {
          light.target.position.set(16, 0, 9);
          light.target.updateMatrixWorld();
        }}
      ></directionalLight>
      <directionalLight position={[30, 9, -15]} intensity={0.65} color="#a9b8e0" />
      <CameraRig />
      <ObjectMarkers world={world} markers={markers} />
      <Garden world={world} />
      {world.champions.map((actor) => (
        <HomeGate
          key={actor.id}
          x={actor.home.x / 1000}
          z={actor.home.y / 1000}
          team={actor.id}
          active={
            (world.status === 'finished' && world.winner === actor.id) ||
            recentEvents(world).some((e) => e.type === 'capture' && e.actorId === actor.id)
          }
        />
      ))}
      <HazardTiles world={world} />
      <Core world={world} reducedMotion={reducedMotion || !animate} />
      <Decoys world={world} />
      <Actor
        index={0}
        world={world}
        animate={animate}
        reducedMotion={reducedMotion}
        markers={markers}
      />
      <Actor
        index={1}
        world={world}
        animate={animate}
        reducedMotion={reducedMotion}
        markers={markers}
      />
      <EventEffects world={world} reducedMotion={reducedMotion || lowEffects} />
      <RenderReady ready={onReady} />
    </>
  );
}
export default function GameScene(props: SceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const lost = (event: Event) => {
      event.preventDefault();
      props.onUnavailable();
    };
    element.addEventListener('webglcontextlost', lost);
    return () => element.removeEventListener('webglcontextlost', lost);
  }, [props.onUnavailable]);
  return (
    <Canvas
      ref={canvas}
      orthographic
      frameloop={
        props.animate && props.world.status === 'running' && !props.reducedMotion
          ? 'always'
          : 'demand'
      }
      camera={{ near: 0.1, far: 160, zoom: 1 }}
      shadows={!props.lowEffects}
      dpr={props.lowEffects ? 1 : [1, 1.5]}
      gl={{ antialias: !props.lowEffects, alpha: false, powerPreference: 'high-performance' }}
      fallback={<span>3D graphics unavailable.</span>}
    >
      <Stage {...props} />
    </Canvas>
  );
}
