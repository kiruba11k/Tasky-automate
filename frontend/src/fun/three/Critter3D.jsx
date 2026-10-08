import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SPECIES } from './species';
import { flat, inkMat, toon } from './toon';
import { HeadGear, NeckGear } from './Gear';

const OUTLINE = 0.035;
const arr = (s) => (typeof s === 'number' ? [s, s, s] : s);

function Geo({ g, args }) {
  switch (g) {
    case 'cone': return <coneGeometry args={args || [1, 2, 20]} />;
    case 'cap': return <capsuleGeometry args={args || [1, 1, 4, 14]} />;
    case 'cyl': return <cylinderGeometry args={args || [1, 1, 1, 18]} />;
    case 'box': return <boxGeometry args={args || [1, 1, 1]} />;
    case 'ico': return <icosahedronGeometry args={args || [1, 1]} />;
    case 'oct': return <octahedronGeometry args={args || [1, 0]} />;
    case 'torus': return <torusGeometry args={args || [1, 0.15, 8, 16, Math.PI]} />;
    default: return <sphereGeometry args={args || [1, 28, 20]} />;
  }
}

/** One solid shape with a cartoon ink outline (an inverted, slightly larger hull). */
export function Part({ g = 'sphere', args, color, p = [0, 0, 0], s = 1, r = [0, 0, 0], outline = true, basic = false, children }) {
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
      {!robot && <group name="mouthO" position={[0, -0.2, 0.7]} scale={0.001}><Part color="#5b1226" s={[0.1, 0.12, 0.05]} outline={false} basic /></group>}
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
/** Something in the right hand (the arm group's origin is the shoulder; the hand hangs about 0.5 below it). */
function Held({ kind }) {
  return (
    <group position={[0, -0.5, 0.06]}>
      {kind === 'wand' && (<>
        <Part g="cyl" args={[1, 1, 1, 8]} color="#7c3aed" s={[0.025, 0.42, 0.025]} p={[0, 0.2, 0]} r={[0.3, 0, 0]} basic outline={false} />
        <Part g="oct" color="#fde047" s={0.1} p={[0, 0.45, 0.12]} basic outline={false} />
      </>)}
      {kind === 'hammer' && (<>
        <Part g="cyl" args={[1, 1, 1, 8]} color="#92400e" s={[0.035, 0.34, 0.035]} p={[0, 0.12, 0]} />
        <Part g="box" color="#9ca3af" s={[0.17, 0.09, 0.09]} p={[0, 0.5, 0]} />
      </>)}
      {kind === 'clipboard' && (<>
        <Part g="box" color="#a16207" s={[0.17, 0.22, 0.02]} p={[0.04, 0.18, 0.04]} r={[-0.3, 0, 0]} />
        <Part g="box" color="#fff7ed" s={[0.14, 0.19, 0.02]} p={[0.04, 0.18, 0.065]} r={[-0.3, 0, 0]} outline={false} />
      </>)}
      {kind === 'camera' && (<>
        <Part g="box" color="#1f2937" s={[0.18, 0.12, 0.1]} p={[0, 0.25, 0.1]} />
        <Part g="cyl" args={[1, 1, 1, 14]} color="#9ca3af" s={[0.07, 0.05, 0.07]} p={[0, 0.25, 0.22]} r={[Math.PI / 2, 0, 0]} />
      </>)}
      {kind === 'telescope' && (<>
        <Part g="cyl" args={[1, 1, 1, 12]} color="#b45309" s={[0.06, 0.32, 0.06]} p={[0, 0.3, 0.1]} r={[0.2, 0, 0]} />
        <Part g="cyl" args={[1, 1, 1, 12]} color="#fbbf24" s={[0.08, 0.05, 0.08]} p={[0, 0.62, 0.17]} r={[0.2, 0, 0]} />
      </>)}
      {kind === 'magnifier' && (<>
        <Part g="cyl" args={[1, 1, 1, 8]} color="#92400e" s={[0.025, 0.2, 0.025]} p={[0, 0.1, 0.05]} />
        <Part g="torus" args={[1, 0.14, 8, 24, Math.PI * 2]} color="#38bdf8" s={[0.16, 0.16, 0.16]} p={[0, 0.34, 0.05]} basic outline={false} />
      </>)}
    </group>
  );
}

export default function Critter3D({ species = 'cat', pose = 'idle', calm = false, scale = 1, equipped, prop, held, ...rest }) {
  const c = SPECIES[species] || SPECIES.cat;
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const root = useRef(); const body = useRef(); const head = useRef(); const tail = useRef();
  const armL = useRef(); const armR = useRef(); const legL = useRef(); const legR = useRef(); const eyes = useRef();
  const seed = useMemo(() => Math.random() * 10, []);
  const limb = c.limbs || c.body;

  const bookPage = useRef(); const bite = useRef();
  useFrame((state) => {
    const t = calm ? 0.35 : state.clock.elapsedTime + seed;
    const p = poseRef.current;
    const sn = Math.sin;
    // targets for this frame; each pose only overrides what it needs
    const o = { y: sn(t * 2) * 0.025, x: 0, rz: 0, rx: 0, bsy: 1, hx: 0, hz: sn(t * 1.3) * 0.05, hy: p === 'idle' ? sn(t * 0.8) * 0.25 : 0, eye: 1, lL: 0, lR: 0, aLz: 0.25, aLx: 0, aRz: -0.25, aRx: 0, tail: sn(t * 3) * 0.55, mouth: 0 };
    switch (p) {
      case 'run': { const w = 16; Object.assign(o, { y: Math.abs(sn(t * w * 0.5)) * 0.14, rz: -0.08, hx: 0.1, lL: sn(t * w) * 0.95, lR: -sn(t * w) * 0.95, aLx: -sn(t * w) * 0.9, aRx: sn(t * w) * 0.9, tail: sn(t * 14) * 0.55 }); break; }
      case 'march': { const w = 7; Object.assign(o, { y: Math.abs(sn(t * w * 0.5)) * 0.07, lL: sn(t * w) * 0.6, lR: -sn(t * w) * 0.6, aLx: -sn(t * w) * 0.7, aRx: sn(t * w) * 0.7, hz: sn(t * w * 0.5) * 0.06 }); break; }
      case 'sleep': Object.assign(o, { y: -0.18, bsy: 0.88 + sn(t * 1.6) * 0.03, hx: 0.55, hz: 0.12, eye: 0.1, tail: sn(t * 3) * 0.1 }); break;
      case 'cheer': Object.assign(o, { y: Math.abs(sn(t * 7)) * 0.5, aLz: 2.7 + sn(t * 10) * 0.3, aRz: -(2.7 + sn(t * 10 + 1) * 0.3) }); break;
      case 'dizzy': Object.assign(o, { rz: sn(t * 5) * 0.12, hz: sn(t * 6) * 0.35, eye: 0.55 }); break;
      case 'scared': Object.assign(o, { x: sn(t * 45) * 0.025, eye: 1.3 }); break;
      case 'wave': Object.assign(o, { aRz: -(2.4 + sn(t * 9) * 0.35) }); break;
      case 'study': Object.assign(o, { hx: 0.42, hz: sn(t * 0.9) * 0.04, hy: 0, aLx: -1.0, aRx: -1.0, aLz: 0.08, aRz: -0.08, eye: (t % 5) < 0.14 ? 0.1 : 0.8 }); break;
      case 'eat': Object.assign(o, { y: Math.abs(sn(t * 10)) * 0.015, hx: 0.05 + sn(t * 10) * 0.05, hz: 0, hy: 0, aRx: -2.15, aRz: -0.35, eye: 0.35 }); break;
      case 'yawn': { const k = Math.max(0, sn((t % 4.5) / 4.5 * Math.PI)); Object.assign(o, { y: k * 0.05, hx: -0.35 * k, hz: 0, hy: 0, aLz: 0.25 + k * 2.1, aRz: -(0.25 + k * 2.1), eye: 1 - k * 0.9, mouth: k }); break; }
      case 'stretch': {
        const cyc = Math.floor(t / 2.4) % 3; const env = sn(((t % 2.4) / 2.4) * Math.PI);
        if (cyc === 0) Object.assign(o, { y: env * 0.08, hx: -env * 0.3, aLz: 0.3 + env * 2.5, aRz: -(0.3 + env * 2.5), eye: 0.4 });
        else if (cyc === 1) Object.assign(o, { rz: sn(t * 2.6) * 0.25, aLz: 2.7, aRz: -2.7, eye: 0.4 });
        else Object.assign(o, { rx: env * 0.5, hx: env * 0.2, aLx: env * 0.6, aRx: env * 0.6, eye: 0.4 });
        break;
      }
      case 'pack': Object.assign(o, { y: Math.abs(sn(t * 5)) * 0.06, aRz: -(2.4 + sn(t * 9) * 0.35), hz: sn(t * 5) * 0.06 }); break;
      case 'highfive': Object.assign(o, { y: Math.abs(sn(t * 4)) * 0.18, aRx: -2.7, aRz: -0.15, hx: -0.1 }); break;
      case 'highfive2': Object.assign(o, { y: Math.abs(sn(t * 4)) * 0.18, aLx: -2.7, aLz: 0.15, hx: -0.1 }); break;
      case 'type': Object.assign(o, { y: sn(t * 2) * 0.01, hx: 0.38, hz: sn(t * 1.1) * 0.04, hy: 0, aLx: -1.15 + sn(t * 15) * 0.12, aRx: -1.15 - sn(t * 15) * 0.12, aLz: 0.12, aRz: -0.12, eye: (t % 4) < 0.14 ? 0.1 : 0.85 }); break;
      case 'present': Object.assign(o, { hy: 0.35, hz: sn(t * 1.4) * 0.05, aRx: -1.55 + sn(t * 2) * 0.12, aRz: -0.35 }); break;
      case 'cast': Object.assign(o, { y: sn(t * 2) * 0.03, hz: sn(t * 1.6) * 0.06, aRx: -0.5, aRz: -(1.9 + sn(t * 5) * 0.35), aLz: 0.5 }); break;
      case 'build': Object.assign(o, { y: Math.abs(sn(t * 4.5)) * 0.03, rx: 0.06, hx: 0.12, aRx: -1.3 + sn(t * 9) * 0.95, aRz: -0.2, aLx: -0.4 }); break;
      case 'shoot': Object.assign(o, { hx: -0.05, hy: 0, hz: 0, aRx: -2.35, aRz: -0.1, aLx: -1.9, aLz: 0.1, eye: 0.7 }); break;
      case 'look': Object.assign(o, { hx: -0.1, hy: sn(t * 0.9) * 0.3, aRx: -2.0 + sn(t * 1.3) * 0.15, aRz: -0.15 }); break;
      case 'dance': Object.assign(o, { y: Math.abs(sn(t * 6)) * 0.2, rz: sn(t * 3) * 0.14, hz: sn(t * 3) * 0.2, aLz: 1.7 + sn(t * 6) * 0.8, aRz: -(1.7 + sn(t * 6 + Math.PI) * 0.8), lL: sn(t * 6) * 0.4, lR: -sn(t * 6) * 0.4, tail: sn(t * 9) * 0.6 }); break;
      default: break;
    }
    if (root.current) { root.current.position.set(o.x, o.y, 0); root.current.rotation.z = o.rz; root.current.rotation.x = o.rx; }
    if (body.current) body.current.scale.set(1, o.bsy, 1);
    if (head.current) { head.current.rotation.set(o.hx, o.hy, o.hz); }
    if (eyes.current) {
      const sy = (t % 4) < 0.12 ? 0.1 : o.eye;
      eyes.current.traverse((n) => { if (n.name === 'eye') n.scale.y = sy; if (n.name === 'mouthO') n.scale.setScalar(Math.max(0.001, o.mouth)); });
    }
    if (legL.current) { legL.current.rotation.x = o.lL; legR.current.rotation.x = o.lR; }
    if (armL.current) { armL.current.rotation.z = o.aLz; armL.current.rotation.x = o.aLx; }
    if (armR.current) { armR.current.rotation.z = o.aRz; armR.current.rotation.x = o.aRx; }
    if (tail.current) tail.current.rotation.y = o.tail;
    if (bookPage.current) bookPage.current.rotation.z = -Math.abs(sn(t * 1.2)) * 2.6;
    if (bite.current) bite.current.scale.setScalar(1 - ((t % 6) / 6) * 0.6);
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
            {held && <Held kind={held} />}
            {wings
              ? <Part color={c.body === '#2f3a52' ? '#26314a' : '#82603f'} s={[0.1, 0.38, 0.22]} p={[-0.04, -0.3, 0]} />
              : <Part g="cap" args={[1, 0.6, 4, 10]} color={limb} s={[0.13, 0.22, 0.13]} p={[0, -0.26, 0]} />}
          </group>
          {equipped && <NeckGear equipped={equipped} />}
          {(prop === 'book' || pose === 'study') && (
            <group position={[0, 0.98, 0.7]} rotation={[-0.55, 0, 0]}>
              <Part g="box" color="#3b82f6" s={[0.3, 0.2, 0.025]} p={[-0.0, 0, -0.02]} />
              <Part g="box" color="#fff7ed" s={[0.27, 0.18, 0.02]} p={[-0.14, 0, 0.012]} outline={false} />
              <group ref={bookPage} position={[0, 0, 0.03]}><Part g="box" color="#fff7ed" s={[0.13, 0.18, 0.012]} p={[0.13, 0, 0]} outline={false} /></group>
            </group>
          )}
          {(prop === 'sandwich' || pose === 'eat') && (
            <group ref={bite} position={[-0.12, 1.3, 0.78]}>
              <Part color="#e9b44c" s={[0.2, 0.06, 0.16]} p={[0, 0.06, 0]} />
              <Part color="#4ade80" s={[0.21, 0.025, 0.17]} p={[0, 0.02, 0]} outline={false} />
              <Part color="#ef4444" s={[0.19, 0.025, 0.15]} p={[0, -0.005, 0]} outline={false} />
              <Part color="#e9b44c" s={[0.2, 0.05, 0.16]} p={[0, -0.05, 0]} />
            </group>
          )}
          {prop === 'laptop' && (
            <group position={[0, 0.78, 0.72]}>
              <Part g="box" color="#cbd5e1" s={[0.34, 0.025, 0.24]} p={[0, 0, 0]} />
              <Part g="box" color="#94a3b8" s={[0.34, 0.2, 0.02]} p={[0, 0.2, -0.22]} r={[-0.25, 0, 0]} />
              <Part g="box" color="#38bdf8" s={[0.3, 0.16, 0.02]} p={[0, 0.2, -0.2]} r={[-0.25, 0, 0]} basic outline={false} />
            </group>
          )}
          {(prop === 'bag' || pose === 'pack') && (
            <group position={[0, 0.82, -0.58]}>
              <Part color="#f59e0b" s={[0.42, 0.5, 0.2]} />
              <Part color="#d97706" s={[0.3, 0.16, 0.06]} p={[0, -0.1, 0.17]} outline={false} />
              <Part g="cap" args={[1, 1, 3, 8]} color="#92400e" s={[0.035, 0.34, 0.035]} p={[0.2, 0.2, 0.48]} r={[0.9, 0, 0]} outline={false} />
              <Part g="cap" args={[1, 1, 3, 8]} color="#92400e" s={[0.035, 0.34, 0.035]} p={[-0.2, 0.2, 0.48]} r={[0.9, 0, 0]} outline={false} />
            </group>
          )}
          <group ref={tail} position={[0, 0.42, -0.5]}>{c.tail !== 'none' && TAILS[c.tail]?.(c)}</group>
        </group>
        {/* head */}
        <group ref={head} position={[0, 1.62, 0.02]}>
          <Part color={c.body} s={[0.82, 0.74, 0.74]} />
          <Ears c={c} species={species} />
          <group ref={eyes}><Face c={c} /></group>
          {pose === 'dizzy' && <DizzyStars />}
          {equipped && <HeadGear equipped={equipped} />}
        </group>
      </group>
    </group>
  );
}
