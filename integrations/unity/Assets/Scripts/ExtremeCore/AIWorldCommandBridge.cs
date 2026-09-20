using Unity.Burst;
using Unity.Collections;
using Unity.Entities;
using Unity.Mathematics;
using Unity.Transforms;

namespace Genesis.ExtremeCore
{
    /// <summary>
    /// Writes protocol-level entity updates directly into ECS. JSON parsing,
    /// authentication and transport framing belong outside this hot path.
    /// </summary>
    public partial class AIWorldCommandBridge : SystemBase
    {
        private EntityQuery _agentQuery;

        protected override void OnCreate()
        {
            base.OnCreate();

            _agentQuery = GetEntityQuery(
                ComponentType.ReadWrite<AIEntityTag>(),
                ComponentType.ReadWrite<LocalTransform>(),
                ComponentType.ReadWrite<AIEntityVelocity>());
        }

        protected override void OnUpdate()
        {
            // Runtime command packets should call ApplySpawnBatch/ApplyTransform
            // from a controlled main-thread ingress, then let this system update
            // the ECS world through ECB/job-safe pathways.
        }

        public void ApplySpawnBatch(
            NativeArray<float3> positions,
            NativeArray<float3> velocities,
            float maxSpeed)
        {
            if (!positions.IsCreated || !velocities.IsCreated)
            {
                return;
            }

            int count = math.min(positions.Length, velocities.Length);
            using var ecb = new EntityCommandBuffer(Allocator.Temp);

            for (int i = 0; i < count; i++)
            {
                var entity = ecb.CreateEntity();

                ecb.AddComponent(entity, LocalTransform.FromPositionRotationScale(
                    positions[i],
                    quaternion.identity,
                    1f));

                ecb.AddComponent(entity, new AIEntityTag());
                ecb.AddComponent(entity, new AIEntityVelocity
                {
                    Value = velocities[i],
                });
                ecb.AddComponent(entity, new AIBoidFlightLogic
                {
                    MaxSpeed = maxSpeed,
                    TurnRate = 2.5f,
                    Separation = 1.5f,
                    Alignment = 0.7f,
                    Cohesion = 0.55f,
                });
            }

            ecb.Playback(EntityManager);
        }
    }
}
