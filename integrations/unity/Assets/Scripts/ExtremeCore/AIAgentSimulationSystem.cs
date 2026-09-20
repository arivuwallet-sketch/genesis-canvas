using Unity.Burst;
using Unity.Entities;
using Unity.Mathematics;
using Unity.Transforms;

namespace Genesis.ExtremeCore
{
    /// <summary>
    /// Burst-compatible crowd/agent update. Use one entity per lightweight agent;
    /// keep presentation, audio and authoring data outside this hot loop.
    /// </summary>
    [BurstCompile]
    public partial struct AIAgentSimulationSystem : ISystem
    {
        [BurstCompile]
        private partial struct MoveAgentsJob : IJobEntity
        {
            public float DeltaTime;

            private void Execute(
                ref LocalTransform transform,
                ref AIEntityVelocity velocity,
                in AIBoidFlightLogic boid)
            {
                float3 desired = math.normalizesafe(velocity.Value, new float3(0, 0, 1));

                float speed = math.length(velocity.Value);
                speed = math.min(speed, math.max(0.01f, boid.MaxSpeed));

                float3 targetVelocity = desired * speed;
                velocity.Value = math.lerp(
                    velocity.Value,
                    targetVelocity,
                    math.saturate(boid.TurnRate * DeltaTime));

                transform.Position += velocity.Value * DeltaTime;

                if (math.lengthsq(velocity.Value) > 0.0001f)
                {
                    quaternion targetRotation = quaternion.LookRotationSafe(
                        velocity.Value,
                        math.up());
                    transform.Rotation = math.slerp(
                        transform.Rotation,
                        targetRotation,
                        math.saturate(boid.TurnRate * DeltaTime));
                }
            }
        }

        public void OnCreate(ref SystemState state)
        {
            state.RequireForUpdate<AIEntityTag>();
        }

        [BurstCompile]
        public void OnUpdate(ref SystemState state)
        {
            var job = new MoveAgentsJob
            {
                DeltaTime = SystemAPI.Time.DeltaTime,
            };

            state.Dependency = job.ScheduleParallel(state.Dependency);
        }
    }
}
