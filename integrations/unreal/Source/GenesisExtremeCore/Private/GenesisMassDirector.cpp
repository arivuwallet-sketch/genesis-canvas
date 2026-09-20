#include "GenesisMassDirector.h"

#include "MassCommonFragments.h"
#include "MassExecutionContext.h"

UGenesisMassDirector::UGenesisMassDirector()
{
    ExecutionFlags = (int32)EProcessorExecutionFlags::All;
    ProcessingPhase = EMassProcessingPhase::PrePhysics;
    bAutoRegisterWithProcessingPhases = true;
}

void UGenesisMassDirector::ConfigureQueries()
{
    EntityQuery.AddRequirement<FMassTransformFragment>(
        EMassFragmentAccess::ReadWrite);
    EntityQuery.AddRequirement<FGenesisTrafficFragment>(
        EMassFragmentAccess::ReadWrite);
    EntityQuery.AddRequirement<FGenesisCrowdFragment>(
        EMassFragmentAccess::ReadOnly);
}

void UGenesisMassDirector::Execute(
    FMassEntityManager& EntityManager,
    FMassExecutionContext& Context)
{
    EntityQuery.ForEachEntityChunk(
        EntityManager,
        Context,
        [](FMassExecutionContext& ExecutionContext)
        {
            TArrayView<FMassTransformFragment> Transforms =
                ExecutionContext.GetMutableFragmentView<FMassTransformFragment>();

            TArrayView<FGenesisTrafficFragment> Traffic =
                ExecutionContext.GetMutableFragmentView<FGenesisTrafficFragment>();

            const float DeltaTime = ExecutionContext.GetDeltaTimeSeconds();

            for (int32 Index = 0; Index < ExecutionContext.GetNumEntities(); ++Index)
            {
                FGenesisTrafficFragment& Vehicle = Traffic[Index];
                FMassTransformFragment& Transform = Transforms[Index];

                const FVector DesiredVelocity =
                    Vehicle.Velocity.GetSafeNormal() * Vehicle.DesiredSpeed;

                Vehicle.Velocity = FMath::VInterpTo(
                    Vehicle.Velocity,
                    DesiredVelocity,
                    DeltaTime,
                    4.0f);

                Transform.Transform.AddToTranslation(
                    Vehicle.Velocity * DeltaTime);
            }
        });
}
