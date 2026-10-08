import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D from './Critter3D';

const ZOOM = 40;
const FACE = 1.15; // 3/4 view, facing right

/** An actor that glides to a target x and runs while it is moving (poses come from real movement, not a timer). */
function Runner({ species, target, rest, y, scale, hide = false, calm }) {
  const g = useRef();
  const x = useRef(target);
  const [pose, setPose] = useState(rest);
  const cur = useRef(rest);
  const restRef = useRef(rest); restRef.current = rest;
  useFrame((_, dt) => {
    if (!g.current) return;
    const d = target - x.current;
    x.current += d * (calm ? 1 : 1 - Math.exp(-dt * 2.6));
    g.current.position.x = x.current;
    const moving = Math.abs(target - x.current) > 0.05;
    const want = moving && restRef.current !== 'sleep' ? 'run' : restRef.current;
    if (want !== cur.current) { cur.current = want; setPose(want); }
    const s = hide && !moving ? 0.0001 : scale;
    g.current.scale.x += (s - g.current.scale.x) * 0.2; g.current.scale.y = g.current.scale.x; g.current.scale.z = g.current.scale.x;
  });
  return (
    <group ref={g} position={[target, y, 0]} scale={scale}>
      <Critter3D species={species} pose={pose} calm={calm} rotation={[0, FACE, 0]} />
    </group>
  );
}

function Actors({ mouseX, catX, padL, padR, catPose, mousePose, done, calm, height }) {
  const { size } = useThree();
  const span = size.width - padL - padR;
  const wx = (p) => (padL + p * span - size.width / 2) / ZOOM;
  const y = -height / 2 / ZOOM + 11 / ZOOM;
  return (
    <>
      <Runner species="cat" target={wx(catX)} rest={catPose === 'dizzy' ? 'dizzy' : catPose === 'sleep' ? 'sleep' : 'idle'} y={y} scale={0.6} calm={calm} />
      <Runner species="mouse" target={wx(mouseX)} rest={mousePose === 'cheer' ? 'cheer' : mousePose === 'scared' ? 'scared' : 'idle'} y={y} scale={0.4} hide={done} calm={calm} />
    </>
  );
}

/** The two chasers for ChaseProgress, drawn as 3D characters over the 2D track. */
export default function ChaseActors(props) {
  const { height, calm } = props;
  return (
    <Stage ortho zoom={ZOOM} calm={calm} className="pointer-events-none" style={{ position: 'absolute', top: 0, left: -props.padL, right: -props.padR, zIndex: 5, height }}>
      <Actors {...props} />
    </Stage>
  );
}
