import * as THREE from 'three';

let ramp;
/** Three-step shading ramp: hard-edged "cel" light and shadow, like a cartoon. */
const gradient = () => {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array([105, 175, 255]), 3, 1, THREE.RedFormat);
    ramp.minFilter = THREE.NearestFilter;
    ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
};

const cache = new Map();
export const toon = (color) => {
  if (!cache.has(color)) cache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient() }));
  return cache.get(color);
};
export const flat = (color) => {
  const k = `flat-${color}`;
  if (!cache.has(k)) cache.set(k, new THREE.MeshBasicMaterial({ color }));
  return cache.get(k);
};
export const inkMat = new THREE.MeshBasicMaterial({ color: '#141225', side: THREE.BackSide });
