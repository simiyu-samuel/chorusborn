import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, OrthographicCamera } from 'three';
import type { CombatStudy } from '@chorusborn/contracts';
import { FighterRig } from './fighter-rig.js';

export type CombatSceneProps = {
  study: CombatStudy;
  tick: number;
  playing: boolean;
  rate: number;
  reducedMotion: boolean;
  onReady: () => void;
  onRendered: (tick: number) => void;
  onUnavailable: () => void;
};
function Lens() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as OrthographicCamera,
      aspect = size.width / Math.max(1, size.height),
      height = Math.max(4.9, 6.5 / aspect);
    cam.left = (-height * aspect) / 2;
    cam.right = (height * aspect) / 2;
    cam.top = height / 2;
    cam.bottom = -height / 2;
    cam.position.set(2.6, 3.6, 11);
    cam.lookAt(0, 1.55, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }, [camera, size.width, size.height]);
  return null;
}
function SparringStage(props: CombatSceneProps) {
  const invalidate = useThree((state) => state.invalidate);
  const clock = useRef(props.tick),
    latest = useRef({ tick: props.tick, at: performance.now() }),
    ready = useRef(false);
  const fighters = useRef<Group>(null);
  useLayoutEffect(() => {
    latest.current = { tick: props.tick, at: performance.now() };
    clock.current = props.tick;
    invalidate();
  }, [props.tick, props.playing, props.rate, props.reducedMotion, invalidate]);
  useFrame(() => {
    const { tick, at } = latest.current;
    clock.current = Math.min(
      240,
      tick +
        (props.playing && !props.reducedMotion
          ? Math.min(1, (performance.now() - at) / 50) * props.rate
          : 0),
    );
    props.onRendered(clock.current);
    if (!ready.current) {
      ready.current = true;
      props.onReady();
    }
  });
  const frame = props.study.frames[Math.min(240, Math.floor(props.tick))]!;
  const hits = useMemo(
    () => props.study.strikes.filter((e) => e.tick <= props.tick && props.tick - e.tick < 5),
    [props.study, props.tick],
  );
  return (
    <>
      <color attach="background" args={['#a9cdd3']} />
      <ambientLight intensity={1.5} color="#d8e7ef" />
      <directionalLight position={[-4, 8, 5]} intensity={2.7} color="#ffead1" />
      <directionalLight position={[3, 4, -4]} intensity={1.8} color="#bfa8ff" />
      <Lens />
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[4, 4.1, 0.25, 64]} />
        <meshLambertMaterial color="#dae2d9" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[3.7, 3.78, 64]} />
        <meshBasicMaterial color="#697e8e" />
      </mesh>
      {[-2.5, 0, 2.5].map((x) => (
        <mesh key={x} position={[x, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.025, 4.8]} />
          <meshBasicMaterial color="#9db9bd" />
        </mesh>
      ))}
      <group ref={fighters}>
        {frame.champions.map((actor) => (
          <group key={actor.id} position={[actor.x / 1000 - 15, 0, actor.y / 1000 - 9.5]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
              <circleGeometry args={[0.42, 24]} />
              <meshBasicMaterial color="#344e61" transparent opacity={0.24} depthWrite={false} />
            </mesh>
            <group rotation={[0, actor.id === 'a' ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <FighterRig
                team={actor.id}
                study={props.study}
                clock={clock}
                reducedMotion={props.reducedMotion}
              />
            </group>
            {actor.shieldUntil > props.tick && actor.health > 0 ? (
              <mesh position={[0, 1.5, 0]} scale={[0.65, 1.35, 0.65]}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshBasicMaterial
                  color="#78c5ee"
                  wireframe
                  transparent
                  opacity={0.25}
                  depthWrite={false}
                />
              </mesh>
            ) : null}
          </group>
        ))}
      </group>
      {!props.reducedMotion
        ? hits.map((hit) => {
            const age = (props.tick - hit.tick) / 5;
            return (
              <group
                key={`${hit.tick}-${hit.actorId}`}
                position={[hit.to.x / 1000 - 15, 1.65, hit.to.y / 1000 - 9.5 + 0.3]}
                scale={1 + age * 0.5}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <mesh
                    key={i}
                    position={[
                      Math.sin((i * Math.PI) / 3) * 0.2,
                      Math.cos((i * Math.PI) / 3) * 0.2,
                      0,
                    ]}
                    rotation={[0, 0, (-i * Math.PI) / 3]}
                  >
                    <coneGeometry args={[0.045, 0.27, 3]} />
                    <meshBasicMaterial
                      color={hit.shielded ? '#a9edff' : '#fff5bd'}
                      transparent
                      opacity={1 - age}
                    />
                  </mesh>
                ))}
              </group>
            );
          })
        : null}
    </>
  );
}
export default function CombatScene(props: CombatSceneProps) {
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
      camera={{ near: 0.1, far: 60, zoom: 1 }}
      dpr={1}
      frameloop={props.playing && !props.reducedMotion ? 'always' : 'demand'}
      gl={{ antialias: false, alpha: false }}
    >
      <SparringStage {...props} />
    </Canvas>
  );
}
