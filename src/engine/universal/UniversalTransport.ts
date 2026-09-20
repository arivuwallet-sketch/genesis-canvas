import protobuf from "protobufjs";

export const PROTOCOL_VERSION = 1;

export const enum TransportFrameType {
  StateDelta = 1,
  Command = 2,
  Ack = 3,
  Heartbeat = 4,
}

const buildSchema = () => {
  const root = new protobuf.Root();

  const Vec3 = new protobuf.Type("Vec3")
    .add(new protobuf.Field("x", 1, "float"))
    .add(new protobuf.Field("y", 2, "float"))
    .add(new protobuf.Field("z", 3, "float"));

  const Transform = new protobuf.Type("Transform")
    .add(new protobuf.Field("position", 1, "Vec3"))
    .add(new protobuf.Field("rotation_euler", 2, "Vec3"))
    .add(new protobuf.Field("scale", 3, "Vec3"));

  const Rigidbody = new protobuf.Type("Rigidbody")
    .add(new protobuf.Field("dynamic", 1, "bool"))
    .add(new protobuf.Field("mass_kg", 2, "float"))
    .add(new protobuf.Field("friction", 3, "float"))
    .add(new protobuf.Field("restitution", 4, "float"))
    .add(new protobuf.Field("gravity_scale", 5, "float"));

  const PbrMaterial = new protobuf.Type("PbrMaterial")
    .add(new protobuf.Field("base_color", 1, "Vec3"))
    .add(new protobuf.Field("metallic", 2, "float"))
    .add(new protobuf.Field("roughness", 3, "float"))
    .add(new protobuf.Field("emissive", 4, "float"));

  const Audio = new protobuf.Type("AudioSpatialNode")
    .add(new protobuf.Field("clip", 1, "string"))
    .add(new protobuf.Field("gain", 2, "float"))
    .add(new protobuf.Field("min_distance", 3, "float"))
    .add(new protobuf.Field("max_distance", 4, "float"))
    .add(new protobuf.Field("looping", 5, "bool"));

  const Behavior = new protobuf.Type("BehaviorState")
    .add(new protobuf.Field("tree", 1, "string"))
    .add(new protobuf.Field("state", 2, "string"))
    .add(new protobuf.Field("tags", 3, "string", "repeated"));

  const EntityState = new protobuf.Type("EntityState")
    .add(new protobuf.Field("entity_id", 1, "string"))
    .add(new protobuf.Field("name", 2, "string"))
    .add(new protobuf.Field("category", 3, "uint32"))
    .add(new protobuf.Field("transform", 4, "Transform"))
    .add(new protobuf.Field("rigidbody", 5, "Rigidbody"))
    .add(new protobuf.Field("material", 6, "PbrMaterial"))
    .add(new protobuf.Field("audio", 7, "AudioSpatialNode"))
    .add(new protobuf.Field("behavior", 8, "BehaviorState"))
    .add(new protobuf.Field("revision", 9, "uint64"));

  const StateDelta = new protobuf.Type("StateDelta")
    .add(new protobuf.Field("revision", 1, "uint64"))
    .add(new protobuf.Field("upsert", 2, "EntityState", "repeated"))
    .add(new protobuf.Field("removed_entity_ids", 3, "string", "repeated"))
    .add(new protobuf.Field("server_time_us", 4, "uint64"));

  const CommandEnvelope = new protobuf.Type("CommandEnvelope")
    .add(new protobuf.Field("correlation_id", 1, "uint64"))
    .add(new protobuf.Field("command_name", 2, "string"))
    .add(new protobuf.Field("payload", 3, "bytes"))
    .add(new protobuf.Field("timestamp_us", 4, "uint64"));

  const TransportFrame = new protobuf.Type("TransportFrame")
    .add(new protobuf.Field("protocol_version", 1, "uint32"))
    .add(new protobuf.Field("frame_type", 2, "uint32"))
    .add(new protobuf.OneOf("body", ["state_delta", "command"]))
    .add(new protobuf.Field("state_delta", 3, "StateDelta"))
    .add(new protobuf.Field("command", 4, "CommandEnvelope"));

  root.define("genesis.engine.v1").add(
    Vec3,
    Transform,
    Rigidbody,
    PbrMaterial,
    Audio,
    Behavior,
    EntityState,
    StateDelta,
    CommandEnvelope,
    TransportFrame,
  );

  return {
    EntityState,
    StateDelta,
    CommandEnvelope,
    TransportFrame,
  };
};

const schema = buildSchema();

export interface UniversalEntityState {
  entityId: string;
  name?: string;
  category?: number;
  transform?: {
    position?: [number, number, number];
    rotationEuler?: [number, number, number];
    scale?: [number, number, number];
  };
  rigidbody?: {
    dynamic: boolean;
    massKg: number;
    friction: number;
    restitution: number;
    gravityScale: number;
  };
  material?: {
    baseColor: [number, number, number];
    metallic: number;
    roughness: number;
    emissive: number;
  };
  audio?: {
    clip: string;
    gain: number;
    minDistance: number;
    maxDistance: number;
    looping: boolean;
  };
  behavior?: {
    tree: string;
    state: string;
    tags: string[];
  };
  revision: number;
}

function vec3(value?: [number, number, number]) {
  return value ? { x: value[0], y: value[1], z: value[2] } : undefined;
}

export function encodeStateDelta(
  revision: number,
  upsert: UniversalEntityState[],
  removedEntityIds: string[],
): ArrayBuffer {
  const delta = schema.StateDelta.create({
    revision,
    upsert: upsert.map((entity) => ({
      entity_id: entity.entityId,
      name: entity.name ?? "",
      category: entity.category ?? 0,
      transform: entity.transform
        ? {
            position: vec3(entity.transform.position),
            rotation_euler: vec3(entity.transform.rotationEuler),
            scale: vec3(entity.transform.scale),
          }
        : undefined,
      rigidbody: entity.rigidbody
        ? {
            dynamic: entity.rigidbody.dynamic,
            mass_kg: entity.rigidbody.massKg,
            friction: entity.rigidbody.friction,
            restitution: entity.rigidbody.restitution,
            gravity_scale: entity.rigidbody.gravityScale,
          }
        : undefined,
      material: entity.material
        ? {
            base_color: vec3(entity.material.baseColor),
            metallic: entity.material.metallic,
            roughness: entity.material.roughness,
            emissive: entity.material.emissive,
          }
        : undefined,
      audio: entity.audio
        ? {
            clip: entity.audio.clip,
            gain: entity.audio.gain,
            min_distance: entity.audio.minDistance,
            max_distance: entity.audio.maxDistance,
            looping: entity.audio.looping,
          }
        : undefined,
      behavior: entity.behavior
        ? {
            tree: entity.behavior.tree,
            state: entity.behavior.state,
            tags: entity.behavior.tags,
          }
        : undefined,
      revision: entity.revision,
    })),
    removed_entity_ids: removedEntityIds,
    server_time_us: Math.trunc(performance.now() * 1000),
  });

  const frame = schema.TransportFrame.create({
    protocol_version: PROTOCOL_VERSION,
    frame_type: TransportFrameType.StateDelta,
    state_delta: delta,
  });

  return schema.TransportFrame.encode(frame).finish().buffer;
}

export function encodeCommand(
  correlationId: bigint,
  commandName: string,
  payload: Uint8Array,
): ArrayBuffer {
  const command = schema.CommandEnvelope.create({
    correlation_id: correlationId.toString(),
    command_name: commandName,
    payload,
    timestamp_us: Math.trunc(performance.now() * 1000).toString(),
  });
  const frame = schema.TransportFrame.create({
    protocol_version: PROTOCOL_VERSION,
    frame_type: TransportFrameType.Command,
    command,
  });
  return schema.TransportFrame.encode(frame).finish().buffer;
}

export function decodeTransportFrame(data: ArrayBuffer) {
  const message = schema.TransportFrame.decode(new Uint8Array(data)) as protobuf.Message<Record<string, unknown>>;
  return schema.TransportFrame.toObject(message, {
    longs: String,
    enums: String,
    defaults: false,
    oneofs: true,
  });
}
