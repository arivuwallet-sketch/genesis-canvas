#pragma once

#include "CoreMinimal.h"
#include "MassProcessor.h"
#include "MassEntityTypes.h"
#include "GenesisMassDirector.generated.h"

USTRUCT()
struct GENESISEXTREMECORE_API FGenesisTrafficFragment : public FMassFragment
{
    GENERATED_BODY()

    UPROPERTY()
    FVector Velocity = FVector::ZeroVector;

    UPROPERTY()
    float DesiredSpeed = 600.0f;

    UPROPERTY()
    uint8 LaneIndex = 0;
};

USTRUCT()
struct GENESISEXTREMECORE_API FGenesisCrowdFragment : public FMassFragment
{
    GENERATED_BODY()

    UPROPERTY()
    float InteractionRadius = 250.0f;

    UPROPERTY()
    uint8 State = 0;
};

UCLASS()
class GENESISEXTREMECORE_API UGenesisMassDirector : public UMassProcessor
{
    GENERATED_BODY()

public:
    UGenesisMassDirector();

protected:
    virtual void ConfigureQueries() override;

    virtual void Execute(
        FMassEntityManager& EntityManager,
        FMassExecutionContext& Context) override;

private:
    FMassEntityQuery EntityQuery;
};
