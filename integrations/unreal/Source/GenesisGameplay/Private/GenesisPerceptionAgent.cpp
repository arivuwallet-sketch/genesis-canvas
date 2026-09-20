#include "GenesisPerceptionAgent.h"

#include "Perception/AIPerceptionTypes.h"

AGenesisPerceptionAgent::AGenesisPerceptionAgent()
{
    PrimaryActorTick.bCanEverTick = false;

    PerceptionComponent =
        CreateDefaultSubobject<UAIPerceptionComponent>(
            TEXT("PerceptionComponent"));

    SightConfig =
        CreateDefaultSubobject<UAISenseConfig_Sight>(
            TEXT("SightConfig"));

    SightConfig->SightRadius = 2000.0f;
    SightConfig->LoseSightRadius = 2400.0f;
    SightConfig->PeripheralVisionAngleDegrees = 75.0f;
    SightConfig->SetMaxAge(2.0f);
    SightConfig->DetectionByAffiliation.bDetectEnemies = true;
    SightConfig->DetectionByAffiliation.bDetectFriendlies = true;
    SightConfig->DetectionByAffiliation.bDetectNeutrals = true;

    PerceptionComponent->ConfigureSense(*SightConfig);
    PerceptionComponent->SetDominantSense(
        SightConfig->GetSenseImplementation());

    PerceptionComponent->OnTargetPerceptionUpdated.AddDynamic(
        this,
        &ThisClass::HandlePerceptionUpdated);
}

void AGenesisPerceptionAgent::HandlePerceptionUpdated(
    AActor* Actor,
    FAIStimulus Stimulus)
{
    if (!Actor)
    {
        return;
    }

    UE_LOG(
        LogTemp,
        Verbose,
        TEXT("[GenesisGameplay] Perception: %s sensed=%s"),
        *Actor->GetName(),
        Stimulus.WasSuccessfullySensed() ? TEXT("true") : TEXT("false"));
}
