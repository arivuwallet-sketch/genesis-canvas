import { useEcsStore, type EcsEntityRecord } from "../../store/useEcsStore";
import { UniversalTransportClient } from "./UniversalTransportClient";
import type { UniversalEntityState } from "./UniversalTransport";

const toEntityState = (entity: EcsEntityRecord): UniversalEntityState => ({
  entityId: entity.id,
  name: entity.name,
  category:
    entity.category === "character"
      ? 1
      : entity.category === "vehicle"
        ? 2
        : entity.category === "environment"
          ? 3
          : entity.category === "system"
            ? 5
            : 4,
  transform: {
    position: entity.transform.position,
    rotationEuler: entity.transform.rotation,
    scale: entity.transform.scale,
  },
  rigidbody: {
    dynamic: entity.physics.bodyType === "dynamic",
    massKg: entity.physics.massKg,
    friction: entity.physics.friction,
    restitution: entity.physics.restitution,
    gravityScale: entity.physics.gravityScale,
  },
  revision: 0,
});

export class UniversalStateSync {
  private readonly transport: UniversalTransportClient;
  private previous = new Map<string, string>();
  private unsubscribe: (() => void) | null = null;
  private revision = 0;

  constructor(url: string) {
    this.transport = new UniversalTransportClient({
      url,
      binaryMode: true,
    });
  }

  start() {
    if (this.unsubscribe) return;
    this.transport.connect();

    this.unsubscribe = useEcsStore.subscribe((state) => {
      const next = new Map<string, string>();
      const changed: UniversalEntityState[] = [];

      for (const entity of state.entities) {
        const wire = toEntityState(entity);
        const encoded = JSON.stringify(wire);
        next.set(entity.id, encoded);

        if (this.previous.get(entity.id) !== encoded) {
          changed.push(wire);
        }
      }

      const removed: string[] = [];
      for (const id of this.previous.keys()) {
        if (!next.has(id)) removed.push(id);
      }

      if (changed.length > 0 || removed.length > 0) {
        this.revision += 1;
        for (const entity of changed) {
          entity.revision = this.revision;
        }
        this.transport.sendStateDelta(changed, removed);
      }

      this.previous = next;
    });
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.transport.dispose();
  }
}
