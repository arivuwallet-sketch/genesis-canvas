/**
 * CSG utilities — three-bvh-csg powered destructible geometry.
 *
 * Everything here is pure geometry math: no AI string ever reaches this file
 * as code, only clamped numbers coming out of CommandParser.
 */
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { PrimitiveGeometry } from "../store/useEditorStore";

export interface Carve {
  /** Local-space centre of the subtracted sphere. */
  position: [number, number, number];
  radius: number;
}

const evaluator = new Evaluator();
evaluator.attributes = ["position", "normal"];

export function makePrimitiveGeometry(kind: PrimitiveGeometry): THREE.BufferGeometry {
  switch (kind) {
    case "sphere":
      return new THREE.SphereGeometry(0.6, 32, 24);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32);
    case "cone":
      return new THREE.ConeGeometry(0.6, 1.2, 32);
    case "torus":
      return new THREE.TorusGeometry(0.5, 0.2, 20, 48);
    case "capsule":
      return new THREE.CapsuleGeometry(0.4, 0.7, 8, 24);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/** Boolean-subtract `subtractMesh` from `targetMesh`, returning a new mesh. */
export function carveMesh(targetMesh: THREE.Mesh, subtractMesh: THREE.Mesh): THREE.Mesh {
  const target = new Brush(targetMesh.geometry.clone());
  target.position.copy(targetMesh.position);
  target.rotation.copy(targetMesh.rotation);
  target.scale.copy(targetMesh.scale);
  target.updateMatrixWorld();

  const tool = new Brush(subtractMesh.geometry.clone());
  tool.position.copy(subtractMesh.position);
  tool.rotation.copy(subtractMesh.rotation);
  tool.scale.copy(subtractMesh.scale);
  tool.updateMatrixWorld();

  const result = evaluator.evaluate(target, tool, SUBTRACTION);
  const mesh = new THREE.Mesh(result.geometry, targetMesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Apply a list of spherical carves to a base primitive, returning geometry. */
export function carveGeometry(
  base: THREE.BufferGeometry,
  carves: Carve[],
): THREE.BufferGeometry {
  if (carves.length === 0) return base;

  let current = new Brush(base.clone());
  current.updateMatrixWorld();

  for (const carve of carves) {
    const tool = new Brush(new THREE.SphereGeometry(Math.max(0.05, carve.radius), 24, 18));
    tool.position.set(carve.position[0], carve.position[1], carve.position[2]);
    tool.updateMatrixWorld();
    try {
      current = evaluator.evaluate(current, tool, SUBTRACTION);
      current.updateMatrixWorld();
    } catch (error) {
      console.warn("[csg] carve failed", error);
      break;
    }
  }

  const geometry = current.geometry.clone();
  geometry.computeVertexNormals();
  return geometry;
}
