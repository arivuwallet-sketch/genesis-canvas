import * as THREE from "three";

/**
 * Shared, mutable player transform. Written every frame by the controller and
 * read by the depth-of-field focus target + network emitter — deliberately
 * outside React so per-frame motion never triggers a render.
 */
export const playerPosition = new THREE.Vector3(0, 1, 0);
export const playerState = { yaw: 0, active: false };
