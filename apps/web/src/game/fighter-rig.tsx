import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ActorId } from '@chorusborn/contracts';
import type { FighterPose } from './combat-motion.js';

type LimbRefs = RefObject<Group | null>[];
function Limb({
  length,
  radius,
  color,
  jointRef,
  children,
}: {
  length: number;
  radius: number;
  color: string;
  jointRef: RefObject<Group | null>;
  children?: React.ReactNode;
}) {
  return (
    <group ref={jointRef}>
      <mesh position={[0, -length / 2, 0]} castShadow>
        <capsuleGeometry args={[radius, length, 3, 6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <group position={[0, -length, 0]}>{children}</group>
    </group>
  );
}
export function FighterRig({ team, samplePose }: { team: ActorId; samplePose: () => FighterPose }) {
  const body = useRef<Group>(null),
    head = useRef<Group>(null),
    scarf = useRef<Group>(null);
  const la = useRef<Group>(null),
    ra = useRef<Group>(null),
    le = useRef<Group>(null),
    re = useRef<Group>(null),
    ll = useRef<Group>(null),
    rl = useRef<Group>(null),
    lk = useRef<Group>(null),
    rk = useRef<Group>(null);
  const joints: LimbRefs = [la, ra, le, re, ll, rl, lk, rk];
  const violet = team === 'a',
    color = violet ? '#a587ef' : '#f3b957',
    dark = violet ? '#28223a' : '#3c2c1b';
  useFrame(() => {
    if (!body.current) return;
    const p = samplePose();
    body.current.position.y = 1.3 + p.lift - p.collapse * 0.95;
    body.current.rotation.set(
      p.lean + p.recoil + p.flip,
      p.spin,
      p.collapse * (violet ? -0.95 : 0.95),
    );
    const angles = [
      p.leftArm,
      p.rightArm,
      p.leftElbow,
      p.rightElbow,
      p.leftLeg,
      p.rightLeg,
      p.leftKnee,
      p.rightKnee,
    ];
    joints.forEach((joint, i) => {
      if (joint.current) joint.current.rotation.x = angles[i]!;
    });
    if (head.current) head.current.rotation.x = -p.recoil * 0.5;
    if (scarf.current) scarf.current.rotation.x = -0.25 - p.lift * 0.65;
  });
  return (
    <group ref={body}>
      <group position={[0, -1.3, 0]}>
        <mesh position={[0, 1.75, 0]} castShadow>
          <capsuleGeometry args={[violet ? 0.17 : 0.21, 0.62, 4, 8]} />
          <meshLambertMaterial color={dark} />
        </mesh>
        <mesh position={[0, 1.87, 0.15]}>
          <boxGeometry args={[0.17, 0.37, 0.045]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <group ref={head} position={[0, 2.51, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.38, 16, 12]} />
            <meshLambertMaterial color={dark} />
          </mesh>
          <mesh position={[0, 0.015, 0.295]} scale={[1, 0.7, 0.55]}>
            <sphereGeometry args={[0.27, 12, 8]} />
            <meshLambertMaterial color="#eee4cb" />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.11, 0.04, 0.435]}>
              <sphereGeometry args={[0.048, 8, 6]} />
              <meshBasicMaterial color="#1d1e28" />
            </mesh>
          ))}
          <mesh position={[0, 0.37, -0.01]} rotation={[0, 0, 0.25]}>
            <coneGeometry args={[violet ? 0.11 : 0.17, violet ? 0.52 : 0.17, 4]} />
            <meshLambertMaterial color={color} />
          </mesh>
          {violet ? (
            <mesh position={[-0.22, 0.33, -0.04]} rotation={[0, 0, 0.55]}>
              <coneGeometry args={[0.09, 0.37, 4]} />
              <meshLambertMaterial color="#cbb7ff" />
            </mesh>
          ) : (
            [-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.34, 0.18, -0.05]} rotation={[0, 0, side * 0.85]}>
                <coneGeometry args={[0.12, 0.3, 4]} />
                <meshLambertMaterial color="#efcf91" />
              </mesh>
            ))
          )}
        </group>
        <group position={[-0.23, 2.07, 0]}>
          <Limb length={0.48} radius={0.095} color={dark} jointRef={la}>
            <Limb length={0.48} radius={0.085} color={color} jointRef={le}>
              <mesh>
                <sphereGeometry args={[0.13, 8, 6]} />
                <meshLambertMaterial color={dark} />
              </mesh>
            </Limb>
          </Limb>
        </group>
        <group position={[0.23, 2.07, 0]}>
          <Limb length={0.48} radius={0.095} color={dark} jointRef={ra}>
            <Limb length={0.48} radius={0.085} color={color} jointRef={re}>
              <mesh>
                <sphereGeometry args={[0.13, 8, 6]} />
                <meshLambertMaterial color={dark} />
              </mesh>
            </Limb>
          </Limb>
        </group>
        <group position={[-0.15, 1.32, 0]}>
          <Limb length={0.6} radius={0.105} color={dark} jointRef={ll}>
            <Limb length={0.6} radius={0.09} color={color} jointRef={lk}>
              <mesh position={[0, -0.02, 0.1]}>
                <boxGeometry args={[0.19, 0.15, 0.36]} />
                <meshLambertMaterial color={dark} />
              </mesh>
            </Limb>
          </Limb>
        </group>
        <group position={[0.15, 1.32, 0]}>
          <Limb length={0.6} radius={0.105} color={dark} jointRef={rl}>
            <Limb length={0.6} radius={0.09} color={color} jointRef={rk}>
              <mesh position={[0, -0.02, 0.1]}>
                <boxGeometry args={[0.19, 0.15, 0.36]} />
                <meshLambertMaterial color={dark} />
              </mesh>
            </Limb>
          </Limb>
        </group>
        {violet ? (
          <group ref={scarf} position={[0, 2.16, -0.1]}>
            <mesh position={[0, -0.35, -0.2]} rotation={[-0.45, 0, 0]}>
              <boxGeometry args={[0.21, 0.75, 0.035]} />
              <meshLambertMaterial color="#9a4876" side={2} />
            </mesh>
          </group>
        ) : (
          <group ref={scarf} position={[0, 2, -0.17]}>
            <mesh position={[0, -0.14, 0]}>
              <boxGeometry args={[0.48, 0.42, 0.09]} />
              <meshLambertMaterial color="#a47c40" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}
