'use client';

import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader } from './aurora.vert';
import { fragmentShader } from './aurora.frag';

const AuroraMaterialImpl = shaderMaterial(
  {
    u_time: 0,
    u_resolution: new THREE.Vector2(1, 1),
    u_mouse: new THREE.Vector2(0.5, 0.5),
    u_channelColors: [
      new THREE.Vector3(0.231, 0.510, 0.965),
      new THREE.Vector3(0.976, 0.451, 0.086),
      new THREE.Vector3(0.471, 0.208, 0.059),
      new THREE.Vector3(0.024, 0.714, 0.831),
      new THREE.Vector3(0.133, 0.773, 0.369),
      new THREE.Vector3(0.886, 0.910, 0.941),
    ],
    u_channelVolumes: [0, 0, 0, 0, 0, 0],
    u_customColors: [
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(1, 1, 1),
    ],
    u_customVolumes: [0, 0, 0, 0],
    u_journeyProgress: 0,
  },
  vertexShader,
  fragmentShader
);

extend({ AuroraMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    auroraMaterialImpl: object;
  }
}

export { AuroraMaterialImpl };
