#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Sight.h"
#include "GenesisPerceptionAgent.generated.h"

UCLASS()
class GENESISGAMEPLAY_API AGenesisPerceptionAgent : public AActor
{
    GENERATED_BODY()

public:
    AGenesisPerceptionAgent();

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UAIPerceptionComponent> PerceptionComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UAISenseConfig_Sight> SightConfig;

private:
    UFUNCTION()
    void HandlePerceptionUpdated(
        AActor* Actor,
        FAIStimulus Stimulus);
};
