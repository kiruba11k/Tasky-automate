import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SPECIES } from './species';
import { flat, inkMat, toon } from './toon';

const OUTLINE = 0.035;
const arr = (s) => (typeof s === 'number' ? [s, s, s] : s);

function Geo({ g, args }) {
  switch (g) {
    case 'cone': return <coneGeometry args={args || [1, 2, 20]} />;
    case 'cap': return <capsuleGeometry args={args || [1, 1, 4, 14]} />;
    case 'cyl': return <cylinderGeometry args={args || [1, 1, 1, 18]} />;
    case 'oct': return <octahedronGeometry args={args || [1, 0]} />;
    case 'torus': return <torusGeometry args={args || [1, 0.15, 8, 16, Math.PI]} />;
    default: return <sphereGeometry args={args || [1, 28, 20]} />;
  }
}

/** One solid shape with a cartoon ink outline (an inverted, slightly larger hull). */
function Part({ g = 'sphere', args, color, p = [0, 0, 0], s = 1, r = [0, 0, 0], outline = true, basic = false, children }) {
  const sc = arr(s);
  return (
    <group position={p} rotation={r}>
      <mesh scale={sc}>
        <Geo g={g} args={args} />
        <primitive object={basic ? flat(color) : toon(color)} attach="material" />
      </mesh>
      {outline && (
        <mesh scale={sc.map((v) => v + OUTLINE)}>
          <Geo g={g} args={args} />
          <primitive object={inkMat} attach="material" />
        </mesh>
      )}
      {children}
    </group>
  );
}

const TAILS = {
  long: (c) => (
    <group>
      <Part g="cap" color={c.body} s={[0.11, 0.42, 0.11]} p={[0, 0.4, 0]} r={[0, 0, 0]} />
      <Part g="cap" color={c.body} s={[0.11, 0.3, 0.11]} p={[0.0, 0.84, -0.12]} r={[-0.8, 0, 0]} />
    </group>
  ),
  thin: () => (
    <group>
      <Part g="cap" color="#f4b5b8" s={[0.055, 0.55, 0.055]} p={[0, 0.5, 0]} />
      <Part g="cap" color="#f4b5b8" s={[0.055, 0.35, 0.055]} p={[0, 1.0, -0.16]} r={[-0.9, 0, 0]} />
    </group>
  ),
  bushy: (c) => (
    <group>
      <Part color={c.body} s={[0.24, 0.26, 0.55]} p={[0, 0.2, -0.3]} r={[0.5, 0, 0]} />
      <Part color="#fff7ec" s={[0.2, 0.2, 0.2]} p={[0, 0.5, -0.75]} />
    </group>
  ),
  puff: (c) => <Part color={c.belly} s={0.2} p={[0, 0, -0.1]} />,
  short: (c) => <Part g="cap" color={c.body} s={[0.1, 0.22, 0.1]} p={[0, 0.18, -0.05]} r={[-0.7, 0, 0]} />,
  dino: (c) => (
    <group>
      <Part g="cone" args={[1, 2, 18]} color={c.body} s={[0.3, 0.55, 0.3]} p={[0, 0.0, -0.55]} r={[-1.75, 0, 0]} />
    </group>
  ),
};

function Ears({ c, species }) {
  const col = c.earColor || c.body;
  switch (c.ear) {
    case 'tri':
      return [-1, 1].map((x) => (
        <Part key={x} g="cone" args={[1, 2, 4]} color={col} s={[0.26, 0.28, 0.1]} p={[x * 0.46, 0.7, 0]} r={[0, 0, -x * 0.35]}>
          <Part g="cone" args={[1, 2, 4]} color={c.earIn} s={[0.14, 0.17, 0.05]} p={[0, -0.06, 0.07]} outline={false} />
        </Part>
      ));
    case 'round': {
      const big = c.earBig ? 0.4 : 0.24;
      return [-1, 1].map((x) => (
        <Part key={x} color={col} s={[big, big, 0.1]} p={[x * (c.earBig ? 0.5 : 0.5), 0.58, -0.02]}>
          {c.earIn && <Part color={c.earIn} s={[big * 0.62, big * 0.62, 0.05]} p={[0, 0, 0.07]} outline={false} />}
        </Part>
      ));
    }
    case 'long':
      return [-1, 1].map((x) => (
        <group key={x} position={[x * 0.28, 0.6, 0]} rotation={[0, 0, -x * 0.18]} data-species={species}>
          <Part color={col} s={[0.17, 0.62, 0.1]} p={[0, 0.5, 0]}>
            <Part color={c.earIn} s={[0.09, 0.45, 0.05]} p={[0, 0, 0.07]} outline={false} />
          </Part>
        </group>
      ));
    case 'floppy':
      return [-1, 1].map((x) => (
        <Part key={x} color={col} s={[0.17, 0.4, 0.1]} p={[x * 0.62, 0.05, 0]} r={[0, 0, x * 0.22]} />
      ));
    case 'tuft':
      return [-1, 1].map((x) => (
        <Part key={x} g="cone" args={[1, 2, 4]} color={c.body} s={[0.2, 0.22, 0.1]} p={[x * 0.42, 0.68, 0]} r={[0, 0, -x * 0.4]} />
      ));
    default:
      return null;
  }
}

function Face({ c }) {
  const robot = c.robot;
  return (
    <>
      {robot ? (
        <Part color="#13203a" s={[0.64, 0.44, 0.14]} p={[0, 0.02, 0.58]} outline={false} />
      ) : null}
      {[-1, 1].map((x) => (
        <group key={x} position={[x * (robot ? 0.24 : 0.27), robot ? 0.04 : 0.06, robot ? 0.7 : 0.62]} data-eye={x}>
          <group name="eye">
            {robot
              ? <Part g="cap" args={[1, 0.2, 4, 10]} color="#67e8f9" s={[0.1, 0.12, 0.05]} basic outline={false} />
              : (
                <Part color="#17142a" s={[0.14, 0.2, 0.09]} outline={false}>
                  <Part color="#ffffff" s={[0.05, 0.06, 0.04]} p={[0.04, 0.07, 0.08]} outline={false} basic />
                </Part>
              )}
          </group>
        </group>
      ))}
      {!robot && [-1, 1].map((x) => <Part key={`b${x}`} color="#ff9db3" s={[0.11, 0.07, 0.03]} p={[x * 0.46, -0.17, 0.52]} outline={false} />)}
      {c.patches && [-1, 1].map((x) => <Part key={`p${x}`} color={c.patches} s={[0.17, 0.22, 0.06]} p={[x * 0.27, 0.06, 0.58]} r={[0, 0, x * 0.5]} outline={false} />)}
      {c.disc && [-1, 1].map((x) => <Part key={`d${x}`} color={c.disc} s={[0.24, 0.24, 0.05]} p={[x * 0.25, 0.06, 0.56]} outline={false} />)}
      {c.muzzle && <Part color={c.muzzle} s={[0.28, 0.2, 0.2]} p={[0, -0.18, 0.58]} outline={false} />}
      {c.beak
        ? <Part g="cone" args={[1, 2, 4]} color={c.beak} s={[0.11, 0.11, 0.08]} p={[0, -0.1, 0.72]} r={[Math.PI / 2, 0, 0]} />
        : c.nose && <Part color={c.nose} s={[0.07, 0.05, 0.05]} p={[0, -0.08, 0.74]} outline={false} />}
      {!robot && !c.beak && <Part g="torus" args={[0.09, 0.016, 6, 14, Math.PI]} color="#2b1b2b" p={[0, -0.17, 0.72]} r={[0, 0, Math.PI]} s={1} basic outline={false} />}
      {c.whisk && [-1, 1].flatMap((x) => [0.04, -0.05].map((y, i) => (
        <Part key={`w${x}${i}`} g="cap" args={[1, 1, 3, 6]} color="#f3f4f6" s={[0.012, 0.2, 0.012]} p={[x * 0.5, -0.13 + y, 0.6]} r={[0, 0, x * (1.45 + i * 0.25)]} outline={false} basic />
      )))}
      {c.stripes && [-0.1, 0, 0.1].map((x) => <Part key={`s${x}`} color={c.stripes} s={[0.03, 0.09, 0.03]} p={[x, 0.55, 0.45]} outline={false} />)}
      {c.spikes && [-0.3, 0, 0.3].map((y, i) => <Part key={`sp${i}`} g="cone" args={[1, 2, 4]} color={c.spikes} s={[0.1, 0.12, 0.08]} p={[0, 0.7 - i * 0.02 + 0.1, -0.25 - i * 0.18]} r={[-0.5, 0, 0]} />)}
      {robot && (
        <group position={[0, 0.78, 0]}>
          <Part g="cap" args={[1, 1, 3, 8]} color="#1e293b" s={[0.03, 0.2, 0.03]} p={[0, 0.2, 0]} />
          <Part color="#facc15" s={0.1} p={[0, 0.45, 0]} basic />
        </group>
      )}
    </>
  );
}

/** Orbiting stars for the "bonk" dizzy moment. */
function DizzyStars() {
  const g = useRef();
  useFrame((s) => { if (g.current) g.current.rotation.y = s.clock.elapsedTime * 4; });
  return (
    <group ref={g} position={[0, 0.98, 0]}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <Part key={i} g="oct" color="#fde047" s={0.1} p={[Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75]} basic outline={false} />;
      })}
    </group>
  );
}

/**
 * A chibi 3D character built from primitives. `pose`: idle | run | sleep | cheer | dizzy | scared | wave.
 * Poses can change at any time (read each frame). `calm` freezes the animation for reduced-motion users.
 */
export default function Critter3D({ species = 'cat', pose = 'idle', calm = false, scale = 1, ...rest }) {
  const c = SPECIES[species] || SPECIES.cat;
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const root = useRef(); const body = useRef(); const head = useRef(); const tail = useRef();
  const armL = useRef(); const armR = useRef(); const legL = useRef(); const legR = useRef(); const eyes = useRef();
  const seed = useMemo(() => Math.random() * 10, []);
  const limb = c.limbs || c.body;

  useFrame((state) => {
    const t = calm ? 0 : state.clock.elapsedTime + seed;
    const p = poseRef.current;
    const run = p === 'run'; const sleep = p === 'sleep'; const cheer = p === 'cheer';
    const dizzy = p === 'dizzy'; const scared = p === 'scared'; const wave = p === 'wave';
    const w = run ? 16 : 2.2;
    if (root.current) {
      root.current.position.y = run ? Math.abs(Math.sin(t * w * 0.5)) * 0.14 : cheer ? Math.abs(Math.sin(t * 7)) * 0.5 : sleep ? -0.18 : Math.sin(t * 2) * 0.025;
      root.current.position.x = scared ? Math.sin(t * 45) * 0.025 : 0;
      root.current.rotation.z = run ? -0.08 : dizzy ? Math.sin(t * 5) * 0.12 : 0;
    }
    if (body.current) body.current.scale.set(1, (sleep ? 0.88 : 1) + (sleep ? Math.sin(t * 1.6) * 0.03 : 0), 1);
    if (head.current) {
      head.current.rotation.x = sleep ? 0.55 : run ? 0.1 : 0;
      head.current.rotation.z = dizzy ? Math.sin(t * 6) * 0.35 : sleep ? 0.12 : Math.sin(t * 1.3) * 0.05;
      head.current.rotation.y = pose === 'idle' ? Math.sin(t * 0.8) * 0.25 : 0;
    }
    if (eyes.current) {
      const blink = (t % 4) < 0.12;
      const sy = sleep || blink ? 0.1 : dizzy ? 0.55 : scared ? 1.3 : 1;
      eyes.current.traverse((o) => { if (o.name === 'eye') o.scale.y = sy; });
    }
    if (legL.current) { legL.current.rotation.x = run ? Math.sin(t * w) * 0.95 : 0; legR.current.rotation.x = run ? -Math.sin(t * w) * 0.95 : 0; }
    if (armL.current) {
      armL.current.rotation.z = cheer ? 2.7 + Math.sin(t * 10) * 0.3 : 0.25;
      armL.current.rotation.x = run ? -Math.sin(t * w) * 0.9 : 0;
    }
    if (armR.current) {
      armR.current.rotation.z = cheer ? -(2.7 + Math.sin(t * 10 + 1) * 0.3) : wave ? -(2.4 + Math.sin(t * 9) * 0.35) : -0.25;
      armR.current.rotation.x = run ? Math.sin(t * w) * 0.9 : 0;
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * (run ? 14 : 3)) * (sleep ? 0.1 : 0.55);
  });

  const wings = c.wings;
  return (
    <group scale={scale} {...rest}>
      <group ref={root}>
        {/* ground shadow */}
        <mesh position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.7, 0.5, 1]}>
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color="#000" transparent opacity={0.22} />
        </mesh>
        <group ref={body}>
          <Part color={c.body} s={[0.62, 0.64, 0.54]} p={[0, 0.66, 0]}>
            <Part color={c.belly} s={[0.44, 0.48, 0.2]} p={[0, -0.04, 0.4]} outline={false} />
          </Part>
          {c.spikes && [0, 1, 2].map((i) => <Part key={i} g="cone" args={[1, 2, 4]} color={c.spikes} s={[0.1, 0.14, 0.08]} p={[0, 1.1 - i * 0.28, -0.5 + i * 0.02]} r={[-0.9, 0, 0]} />)}
          {/* legs */}
          <group ref={legL} position={[0.27, 0.3, 0.04]}>
            <Part g="cap" args={[1, 0.5, 4, 10]} color={limb} s={[0.15, 0.2, 0.15]} p={[0, -0.12, 0]} />
            <Part color={c.feet || limb} s={[0.19, 0.11, 0.27]} p={[0, -0.3, 0.09]} />
          </group>
          <group ref={legR} position={[-0.27, 0.3, 0.04]}>
            <Part g="cap" args={[1, 0.5, 4, 10]} color={limb} s={[0.15, 0.2, 0.15]} p={[0, -0.12, 0]} />
            <Part color={c.feet || limb} s={[0.19, 0.11, 0.27]} p={[0, -0.3, 0.09]} />
          </group>
          {/* arms */}
          <group ref={armL} position={[0.6, 0.98, 0.04]}>
            {wings
              ? <Part color={c.body === '#2f3a52' ? '#26314a' : '#82603f'} s={[0.1, 0.38, 0.22]} p={[0.04, -0.3, 0]} />
              : <Part g="cap" args={[1, 0.6, 4, 10]} color={limb} s={[0.13, 0.22, 0.13]} p={[0, -0.26, 0]} />}
          </group>
          <group ref={armR} position={[-0.6, 0.98, 0.04]}>
            {wings
              ? <Part color={c.body === '#2f3a52' ? '#26314a' : '#82603f'} s={[0.1, 0.38, 0.22]} p={[-0.04, -0.3, 0]} />
              : <Part g="cap" args={[1, 0.6, 4, 10]} color={limb} s={[0.13, 0.22, 0.13]} p={[0, -0.26, 0]} />}
          </group>
          <group ref={tail} position={[0, 0.42, -0.5]}>{c.tail !== 'none' && TAILS[c.tail]?.(c)}</group>
        </group>
        {/* head */}
        <group ref={head} position={[0, 1.62, 0.02]}>
          <Part color={c.body} s={[0.82, 0.74, 0.74]} />
          <Ears c={c} species={species} />
          <group ref={eyes}><Face c={c} /></group>
          {pose === 'dizzy' && <DizzyStars />}
        </group>
      </group>
    </group>
  );
}
