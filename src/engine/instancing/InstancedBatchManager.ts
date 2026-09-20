import * as THREE from "three";

export interface InstanceRecord {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color?: THREE.Color;
}

interface Batch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  mesh: THREE.InstancedMesh;
  capacity: number;
  freeIndices: number[];
  ids: string[];
}

export class InstancedBatchManager {
  private readonly batches = new Map<string, Batch>();
  private readonly maxInstancesPerBatch: number;

  constructor(maxInstancesPerBatch = 2048) {
    this.maxInstancesPerBatch = Math.max(1, Math.floor(maxInstancesPerBatch));
  }

  createBatch(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity = this.maxInstancesPerBatch,
  ) {
    if (this.batches.has(key)) {
      throw new Error(`Instanced batch "${key}" already exists.`);
    }

    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      Math.min(this.maxInstancesPerBatch, Math.max(1, capacity)),
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = true;

    const batch: Batch = {
      geometry,
      material,
      mesh,
      capacity: mesh.count,
      freeIndices: Array.from({ length: mesh.count }, (_, index) => mesh.count - index - 1),
      ids: new Array(mesh.count).fill(""),
    };

    this.batches.set(key, batch);
    return mesh;
  }

  upsert(key: string, record: InstanceRecord): boolean {
    const batch = this.batches.get(key);
    if (!batch) return false;

    let index = batch.ids.indexOf(record.id);

    if (index < 0) {
      index = batch.freeIndices.pop() ?? -1;
      if (index < 0) return false;
      batch.ids[index] = record.id;
    }

    const matrix = new THREE.Matrix4().compose(
      record.position,
      new THREE.Quaternion().setFromEuler(record.rotation),
      record.scale,
    );

    batch.mesh.setMatrixAt(index, matrix);
    if (record.color) batch.mesh.setColorAt(index, record.color);

    batch.mesh.instanceMatrix.needsUpdate = true;
    if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    return true;
  }

  remove(key: string, id: string): boolean {
    const batch = this.batches.get(key);
    if (!batch) return false;

    const index = batch.ids.indexOf(id);
    if (index < 0) return false;

    batch.ids[index] = "";
    batch.freeIndices.push(index);
    batch.mesh.setMatrixAt(index, new THREE.Matrix4().makeScale(0, 0, 0));
    batch.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  getMesh(key: string) {
    return this.batches.get(key)?.mesh ?? null;
  }

  dispose() {
    for (const batch of this.batches.values()) {
      batch.mesh.dispose();
      batch.material.dispose();
      batch.geometry.dispose();
    }
    this.batches.clear();
  }
}
