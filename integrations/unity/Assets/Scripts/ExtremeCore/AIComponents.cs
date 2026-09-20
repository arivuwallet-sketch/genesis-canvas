using Unity.Entities;
using Unity.Mathematics;
using Unity.Transforms;

namespace Genesis.ExtremeCore
{
    public struct AIEntityTag : IComponentData
    {
    }

    public struct AIEntityVelocity : IComponentData
    {
        public float3 Value;
    }

    public struct AIBoidFlightLogic : IComponentData
    {
        public float MaxSpeed;
        public float TurnRate;
        public float Separation;
        public float Alignment;
        public float Cohesion;
    }

    public struct AIRigidBody : IComponentData
    {
        public float MassKg;
        public float Friction;
        public float Restitution;
        public float GravityScale;
    }

    public struct AIBehaviorState : IComponentData
    {
        public int StateId;
        public int TriggerMask;
    }

    public struct AICommandSequence : IComponentData
    {
        public uint Revision;
    }

    public struct AISpatialBounds : IComponentData
    {
        public float3 HalfExtents;
    }

    public struct AIEntitySnapshot
    {
        public Entity Entity;
        public LocalTransform Transform;
        public AIEntityVelocity Velocity;
        public AIBoidFlightLogic Boid;
        public AISpatialBounds Bounds;
        public AIBehaviorState Behavior;
    }
}
