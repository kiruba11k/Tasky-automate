import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Critter3D, { Part } from './Critter3D';

export const Z = 62;
const useLayout = () => { const { size, camera } = useThree(); const z = camera.zoom || Z; const W = size.width / z; const H = size.height / z; return { W, H, gy: -H / 2 + 0.28 }; };
const damp = (cur, target, dt, rate = 4) => cur + (target - cur) * (1 - Math.exp(-dt * rate));
const COL = ['#34d399', '#60a5fa', '#f472b6', '#facc15', '#a78bfa', '#fb923c'];

function Buddy({ x, gy, s = 0.6, species, pose = 'idle', calm, rot = 0.5, ...rest }) {
  return <group position={[x, gy, 0]} scale={s}><Critter3D species={species} pose={pose} calm={calm} rotation={[0, rot, 0]} {...rest} /></group>;
}

/** Daily tasks: a robot at a desk; one sticky note per task still to do, and the stack shrinks as you finish them. */
export function WorkbenchScene({ pending = 0, calm }) {
  const { W, gy } = useLayout();
  const notes = useRef([]);
  useFrame((_, dt) => notes.current.forEach((m, i) => { if (m) { const want = i < Math.min(12, pending) ? 1 : 0; m.scale.x = damp(m.scale.x, want, dt, 6); m.scale.y = m.scale.x; m.scale.z = m.scale.x; } }));
  const x = W * 0.22;
  return (
    <>
      <Buddy x={x} gy={gy} species="robot" pose="type" prop="laptop" calm={calm} />
      <group position={[x, gy, 0.5]}>
        <Part g="box" color="#b45309" s={[0.95, 0.04, 0.4]} p={[0, 0.43, 0]} />
        {[-0.8, 0.8].map((dx) => <Part key={dx} g="box" color="#92400e" s={[0.04, 0.2, 0.34]} p={[dx * 0.5, 0.2, 0]} />)}
      </group>
      <group position={[x + 1.35, gy + 0.47, 0.5]}>
        {Array.from({ length: 12 }, (_, i) => (
          <group key={i} ref={(el) => { notes.current[i] = el; }} position={[(i % 2) * 0.03, i * 0.045, 0]} rotation={[0, (i % 3) * 0.2 - 0.2, 0]}>
            <Part g="box" color={COL[i % COL.length]} s={[0.32, 0.02, 0.32]} outline={false} />
          </group>
        ))}
      </group>
    </>
  );
}

/** Weekly tasks: the week as a train, chugging along with a passenger waving from each car. */
export function TrainScene({ calm, friday = false }) {
  const { W, gy } = useLayout();
  const g = useRef(); const smoke = useRef([]); const conf = useRef([]);
  const L = 7.2;
  useFrame((s) => {
    const t = calm ? 0.5 : s.clock.elapsedTime;
    if (g.current) g.current.position.x = ((t * 1.3 + W * 0.25 + (calm ? W * 0.3 : 0)) % (W + L + 2)) - W / 2 - 1;
    conf.current.forEach((m, i) => { if (!m) return; const k = (t * (0.35 + (i % 5) * 0.06) + i * 0.137) % 1; m.position.set(0.7 - ((i * 0.61) % 7.4) + Math.sin(t * 2 + i) * 0.15, 2.3 - k * 2.2, ((i % 3) - 1) * 0.25); m.rotation.set(t * 3 + i, t * 2, i); });
    smoke.current.forEach((m, i) => { if (!m) return; const k = ((t * 0.8 + i * 0.25) % 1); m.position.set(0.55 - k * 0.6, 1.0 + k * 0.9, 0); m.scale.setScalar(0.08 + k * 0.2); m.visible = !calm || i === 0; });
  });
  const cars = ['#34d399', '#60a5fa', '#f472b6', '#facc15', '#a78bfa'];
  const riders = ['cat', 'panda', 'fox', 'bunny', 'dino'];
  return (
    <>
      <Part g="box" color="#6b7280" s={[W, 0.04, 0.3]} p={[0, gy + 0.05, -0.2]} outline={false} />
      <group ref={g} position={[0, gy, 0]}>
        {/* locomotive at the front (right) */}
        <group position={[0, 0, 0]}>
          <Part g="box" color="#ef4444" s={[0.7, 0.26, 0.28]} p={[0.0, 0.4, 0]} />
          <Part g="cyl" args={[1, 1, 1, 18]} color="#dc2626" s={[0.24, 0.34, 0.24]} p={[0.3, 0.46, 0]} r={[0, 0, Math.PI / 2]} />
          <Part g="cyl" args={[1, 1, 1, 12]} color="#1f2937" s={[0.07, 0.14, 0.07]} p={[0.48, 0.82, 0]} />
          <Part g="box" color="#b91c1c" s={[0.26, 0.34, 0.3]} p={[-0.34, 0.5, 0]} />
          {[-0.3, 0.1, 0.4].map((dx) => <Part key={dx} g="cyl" args={[1, 1, 1, 14]} color="#111827" s={[0.12, 0.04, 0.12]} p={[dx, 0.14, 0.17]} r={[Math.PI / 2, 0, 0]} />)}
          <group position={[0, 0, 0.0]}>{[0, 1, 2, 3].map((i) => <mesh key={i} ref={(el) => { smoke.current[i] = el; }} position={[0.5, 1, 0]}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color="#e5e7eb" transparent opacity={0.7} /></mesh>)}</group>
        </group>
        {cars.map((c, i) => (
          <group key={c} position={[-1.35 - i * 1.25, 0, 0]}>
            <Part g="box" color={c} s={[0.55, 0.26, 0.28]} p={[0, 0.4, 0]} />
            <Part g="box" color="#fef9c3" s={[0.34, 0.1, 0.02]} p={[0, 0.46, 0.29]} basic outline={false} />
            {[-0.28, 0.28].map((dx) => <Part key={dx} g="cyl" args={[1, 1, 1, 14]} color="#111827" s={[0.1, 0.04, 0.1]} p={[dx, 0.14, 0.17]} r={[Math.PI / 2, 0, 0]} />)}
            <group position={[0, 0.67, 0]} scale={0.3}><Critter3D species={riders[i]} pose={friday ? 'dance' : 'wave'} equipped={friday ? { hat: 'partyhat' } : undefined} calm={calm} rotation={[0, 0.5, 0]} /></group>
            <Part g="cyl" args={[1, 1, 1, 8]} color="#6b7280" s={[0.02, 0.02, 0.28]} p={[0.72, 0.24, 0]} r={[0, 0, Math.PI / 2]} outline={false} />
          </group>
        ))}
        {friday && Array.from({ length: 44 }, (_, i) => <group key={`cf${i}`} ref={(el) => { conf.current[i] = el; }}><Part g="box" color={COL[i % COL.length]} s={[0.05, 0.02, 0.08]} basic outline={false} /></group>)}
      </group>
    </>
  );
}

/** Analytics: three bars for the week (planned, done, still to go) that grow into place, with a penguin inspecting them. */
export function BarsScene({ planned = 0, done = 0, calm }) {
  const { W, gy } = useLayout();
  const bars = useRef([]);
  const max = Math.max(planned, 1);
  const vals = [planned, done, Math.max(0, planned - done)];
  useFrame((_, dt) => bars.current.forEach((m, i) => { if (m) { const h = Math.max(0.06, (vals[i] / max) * 1.9); m.scale.y = calm ? h : damp(m.scale.y, h, dt, 3); m.position.y = m.scale.y / 2; } }));
  const x0 = W * 0.08;
  return (
    <>
      <Buddy x={x0 - 1.7} gy={gy} species="penguin" pose="look" held="magnifier" calm={calm} rot={0.9} />
      <group position={[x0 + 0.2, gy, 0]}>
        <Part g="box" color="#475569" s={[2.4, 0.05, 0.5]} p={[0.8, 0.0, 0]} outline={false} />
        {['#6366f1', '#34d399', '#fb923c'].map((c, i) => (
          <group key={c} position={[i * 0.8, 0, 0]}>
            <group ref={(el) => { bars.current[i] = el; }} scale={[1, 0.06, 1]}><Part g="box" color={c} s={[0.28, 0.5, 0.28]} /></group>
          </group>
        ))}
      </group>
    </>
  );
}

function Gear({ r, teeth, color, speed, phase = 0, calm, ...pos }) {
  const g = useRef();
  useFrame((s) => { if (g.current) g.current.rotation.z = calm ? phase : phase + s.clock.elapsedTime * speed; });
  return (
    <group position={pos.p} ref={g}>
      <Part g="cyl" args={[1, 1, 1, 24]} color={color} s={[r, 0.16, r]} r={[Math.PI / 2, 0, 0]} />
      <Part g="cyl" args={[1, 1, 1, 14]} color="#1f2937" s={[r * 0.28, 0.2, r * 0.28]} r={[Math.PI / 2, 0, 0]} outline={false} />
      {Array.from({ length: teeth }, (_, i) => { const a = (i / teeth) * Math.PI * 2; return <Part key={i} g="box" color={color} s={[r * 0.16, r * 0.14, 0.08]} p={[Math.cos(a) * (r + r * 0.12), Math.sin(a) * (r + r * 0.12), 0]} r={[0, 0, a]} />; })}
    </group>
  );
}

/** Management: meshing gears that spin faster the more the team gets done, with an owl presenting the numbers. */
export function GearsScene({ activity = 0, health = 0, calm }) {
  const { W, gy } = useLayout();
  const sp = 0.35 + Math.min(activity, 6) * 0.25;
  const cx = W * 0.1;
  const liquid = useRef(); const cur = useRef(0.05);
  useFrame((s, dt) => {
    cur.current = calm ? health : damp(cur.current, health, dt, 2.5);
    if (liquid.current) { liquid.current.scale.y = Math.max(0.02, cur.current * 1.6); liquid.current.position.y = (cur.current * 1.6) / 2; }
  });
  const hot = health < 0.34 ? '#38bdf8' : health < 0.67 ? '#34d399' : '#fb923c';
  return (
    <>
      <group position={[cx + 3.0, gy + 0.3, 0]}>
        <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.15, 0.15, 1.8, 16]} /><meshBasicMaterial color="#e0f2fe" transparent opacity={0.3} /></mesh>
        <Part color={hot} s={0.28} p={[0, 0, 0]} basic outline={false} />
        <group ref={liquid} position={[0, 0.05, 0]}><Part g="cyl" args={[1, 1, 1, 14]} color={hot} s={[0.08, 0.5, 0.08]} basic outline={false} /></group>
        {[0.3, 0.6, 0.9, 1.2, 1.5].map((y) => <Part key={y} g="box" color="#e2e8f0" s={[0.09, 0.012, 0.01]} p={[0.2, y, 0]} basic outline={false} />)}
      </group>
      <Buddy x={cx - 2.4} gy={gy} species="owl" pose="present" held="clipboard" calm={calm} rot={0.9} />
      <Gear p={[cx - 0.3, gy + 1.2, -0.3]} r={0.8} teeth={10} color="#f59e0b" speed={sp} calm={calm} />
      <Gear p={[cx + 1.12, gy + 0.86, -0.3]} r={0.5} teeth={6} color="#38bdf8" speed={-sp * 1.6} phase={0.3} calm={calm} />
      <Gear p={[cx + 0.25, gy + 0.3, -0.3]} r={0.3} teeth={5} color="#34d399" speed={sp * 2.6} phase={0.2} calm={calm} />
    </>
  );
}

/** Projects: a tower that grows a block at a time as projects progress, with a crane and a fox hammering. */
export function BuildScene({ progress = 0, calm }) {
  const { W, gy } = useLayout();
  const N = 8;
  const n = Math.round((Math.max(0, Math.min(100, progress)) / 100) * N);
  const blocks = useRef([]); const hook = useRef();
  useFrame((s, dt) => {
    blocks.current.forEach((m, i) => { if (!m) return; const want = gy + (i < n ? 0.12 + i * 0.26 : 4.5); m.position.y = calm ? want : damp(m.position.y, want, dt, i < n ? 5 : 9); });
    if (hook.current) hook.current.rotation.z = calm ? 0 : Math.sin(s.clock.elapsedTime * 1.2) * 0.12;
  });
  const tx = W * 0.2;
  return (
    <>
      <Part g="box" color="#78716c" s={[0.9, 0.06, 0.6]} p={[tx, gy, 0]} outline={false} />
      {Array.from({ length: N }, (_, i) => (
        <group key={i} ref={(el) => { blocks.current[i] = el; }} position={[tx, gy + 4.5, 0]}><Part g="box" color={COL[i % COL.length]} s={[0.4, 0.12, 0.28]} /></group>
      ))}
      <Buddy x={tx - 1.5} gy={gy} species="fox" pose="build" held="hammer" calm={calm} rot={1.0} equipped={{ hat: 'cap' }} />
      <group position={[tx + 1.6, gy, -0.4]}>
        <Part g="box" color="#fbbf24" s={[0.09, 1.3, 0.09]} p={[0, 1.3, 0]} />
        <Part g="box" color="#f59e0b" s={[1.7, 0.07, 0.09]} p={[-0.8, 2.55, 0]} />
        <group ref={hook} position={[-1.6, 2.5, 0]}>
          <Part g="cyl" args={[1, 1, 1, 6]} color="#1f2937" s={[0.012, 0.5, 0.012]} p={[0, -0.5, 0]} outline={false} />
          <Part g="box" color="#ef4444" s={[0.22, 0.12, 0.2]} p={[0, -1.05, 0]} />
        </group>
      </group>
    </>
  );
}

/** Task board: crates pile up by status, and one keeps hopping from To do toward Done. */
export function CratesScene({ todo = 0, doing = 0, done = 0, calm }) {
  const { W, gy } = useLayout();
  const flyer = useRef();
  const xs = [W * 0.08, W * 0.08 + 1.4, W * 0.08 + 2.8];
  const max = Math.max(todo, doing, done, 1);
  const counts = [todo, doing, done].map((v) => Math.min(6, Math.ceil((v / max) * 6)));
  useFrame((s) => {
    if (!flyer.current) return;
    const t = calm ? 0 : s.clock.elapsedTime;
    const leg = Math.floor(t / 1.6) % 2; const k = (t % 1.6) / 1.6;
    flyer.current.position.set(xs[leg] + (xs[leg + 1] - xs[leg]) * k, gy + 1.2 + Math.sin(k * Math.PI) * 0.9, 0.2);
    flyer.current.rotation.z = k * 0.6;
    flyer.current.visible = !calm;
  });
  return (
    <>
      <Buddy x={xs[0] - 1.4} gy={gy} species="bunny" pose="present" calm={calm} rot={0.9} />
      {xs.map((x, si) => (
        <group key={x} position={[x, gy, 0]}>
          <Part g="box" color="#57534e" s={[0.6, 0.04, 0.45]} p={[0, 0.02, 0]} outline={false} />
          {Array.from({ length: counts[si] }, (_, i) => <Part key={i} g="box" color={['#60a5fa', '#fbbf24', '#34d399'][si]} s={[0.28, 0.1, 0.22]} p={[(i % 2) * 0.03, 0.14 + i * 0.21, 0]} r={[0, (i % 3) * 0.15, 0]} />)}
        </group>
      ))}
      <group ref={flyer}><Part g="box" color="#f472b6" s={[0.28, 0.1, 0.22]} /></group>
    </>
  );
}

/** Team: a group photo on risers with a photographer; the flash goes off every few seconds and everyone cheers. */
export function PhotoScene({ members = [], calm, onFlash }) {
  const { W, gy } = useLayout();
  const [cheer, setCheer] = useState(false);
  const last = useRef(-1);
  useFrame((s) => {
    if (calm) return;
    const cyc = Math.floor(s.clock.elapsedTime / 6);
    const phase = s.clock.elapsedTime % 6;
    if (phase > 4.5 && last.current !== cyc) { last.current = cyc; onFlash?.(); setCheer(true); setTimeout(() => setCheer(false), 1400); }
  });
  const list = members.slice(0, 7);
  const n = Math.max(1, list.length);
  const x0 = W * 0.1;
  return (
    <>
      <Buddy x={x0 - 3.1} gy={gy} species="dog" pose="shoot" held="camera" calm={calm} rot={1.1} />
      {list.map((m, i) => {
        const mid = (n - 1) / 2; const up = Math.round(mid - Math.abs(i - mid));
        return (
          <group key={m.id} position={[x0 - 1.4 + i * (3.8 / Math.max(1, n - 1)), gy, 0]}>
            <Part g="box" color="#6b7280" s={[0.32, 0.12 + up * 0.15, 0.4]} p={[0, (0.12 + up * 0.15) / 2, 0]} outline={false} />
            <group position={[0, 0.12 + up * 0.3, 0]} scale={0.38}><Critter3D species={m.species} equipped={m.equipped} pose={cheer ? 'cheer' : 'idle'} calm={calm} rotation={[0, -0.4, 0]} /></group>
          </group>
        );
      })}
    </>
  );
}

/** AI allocation: a wizard bear conjures task cubes from a crystal ball and they fly to the team. */
export function MagicScene({ calm }) {
  const { W, gy } = useLayout();
  const ball = useRef(); const cubes = useRef([]);
  const [hit, setHit] = useState(-1);
  const last = useRef(-1);
  const cx = -W * 0.06;
  const targets = [cx + 2.2, cx + 3.1, cx + 4.0];
  useFrame((s) => {
    const t = calm ? 0 : s.clock.elapsedTime;
    if (ball.current) { ball.current.rotation.y = t * 0.8; ball.current.position.y = gy + 1.35 + Math.sin(t * 2) * 0.07; }
    cubes.current.forEach((m, i) => {
      if (!m) return;
      const p = ((t * 0.5 + i / 3) % 1); const tx = targets[i];
      if (p < 0.5) { const a = t * 2 + i * 2.1; m.position.set(cx + Math.cos(a) * 0.75, gy + 1.35 + Math.sin(a) * 0.3, Math.sin(a) * 0.5); }
      else { const k = (p - 0.5) / 0.5; m.position.set(cx + (tx - cx) * k, gy + 1.35 + Math.sin(k * Math.PI) * 0.8 - k * 0.8, 0.2); if (k > 0.97 && last.current !== i && !calm) { last.current = i; setHit(i); setTimeout(() => setHit(-1), 900); } }
      m.rotation.set(t * 3, t * 2, 0);
    });
  });
  return (
    <>
      <Buddy x={cx - 1.9} gy={gy} species="bear" pose="cast" held="wand" calm={calm} rot={0.9} equipped={{ hat: 'wizard' }} />
      <mesh ref={ball} position={[cx, gy + 1.35, 0]}><icosahedronGeometry args={[0.45, 1]} /><meshBasicMaterial color="#a78bfa" transparent opacity={0.55} /></mesh>
      <Part g="cyl" args={[1, 1, 1, 14]} color="#78350f" s={[0.3, 0.12, 0.3]} p={[cx, gy + 0.82, 0]} />
      {[0, 1, 2].map((i) => <group key={i} ref={(el) => { cubes.current[i] = el; }}><Part g="box" color={COL[i + 1]} s={[0.12, 0.12, 0.12]} /></group>)}
      {['cat', 'mouse', 'bunny'].map((sp, i) => <Buddy key={sp} x={targets[i]} gy={gy} s={0.5} species={sp} pose={hit === i ? 'cheer' : 'idle'} calm={calm} rot={-0.4} />)}
    </>
  );
}

/** Integration: data packets stream from a cloud to a spreadsheet while a dino keeps watch. */
export function LinkScene({ calm }) {
  const { W, gy } = useLayout();
  const pk = useRef([]); const pulse = useRef();
  const a = [W * 0.02 - 1.2, gy + 2.0]; const b = [W * 0.02 + 3.0, gy + 1.0];
  useFrame((s) => {
    const t = calm ? 0.3 : s.clock.elapsedTime;
    pk.current.forEach((m, i) => { if (!m) return; const k = (t * 0.45 + i / 5) % 1; m.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k + Math.sin(k * Math.PI) * 0.7, 0.1); m.rotation.set(t * 2, t * 3, 0); const sc = k < 0.9 ? 1 : (1 - k) * 10; m.scale.setScalar(sc); });
    if (pulse.current) pulse.current.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.8)) * 0.08);
  });
  return (
    <>
      <group position={[a[0], a[1], -0.2]}>
        {[[0, 0, 0.45], [0.45, -0.05, 0.35], [-0.45, -0.05, 0.32], [0.1, 0.25, 0.3]].map((c, i) => <Part key={i} color="#e0f2fe" s={[c[2], c[2], c[2]]} p={[c[0], c[1], 0]} />)}
      </group>
      <group ref={pulse} position={[b[0], b[1], -0.2]}>
        <Part g="box" color="#ecfdf5" s={[0.6, 0.72, 0.05]} />
        {[-0.3, 0, 0.3].map((y) => <Part key={y} g="box" color="#34d399" s={[0.5, 0.025, 0.06]} p={[0, y, 0.03]} basic outline={false} />)}
        <Part g="box" color="#34d399" s={[0.025, 0.66, 0.06]} p={[0, 0, 0.03]} basic outline={false} />
      </group>
      {[0, 1, 2, 3, 4].map((i) => <group key={i} ref={(el) => { pk.current[i] = el; }}><Part g="box" color="#34d399" s={[0.1, 0.1, 0.1]} outline={false} /></group>)}
      <Buddy x={W * 0.02 + 0.9} gy={gy} species="dino" pose="wave" calm={calm} rot={0.6} />
    </>
  );
}
