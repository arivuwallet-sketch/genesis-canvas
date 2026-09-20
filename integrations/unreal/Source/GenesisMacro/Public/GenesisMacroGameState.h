#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "GenesisMacroTypes.h"
#include "GenesisMacroGameState.generated.h"

UCLASS()
class GENESISMACRO_API AGenesisMacroGameState : public AGameStateBase
{
    GENERATED_BODY()

public:
    AGenesisMacroGameState();

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Macro")
    float TimeRemainingSeconds = 1200.0f;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Macro")
    int32 Score = 0;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Macro")
    bool bPlayerAlive = true;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Macro")
    bool bArtifactSecured = false;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Macro")
    bool bExtracted = false;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Macro")
    EGenesisMacroLoopStatus LoopStatus = EGenesisMacroLoopStatus::Active;

    UPROPERTY(Replicated, BlueprintReadOnly, Category = "Genesis|Director")
    FGenesisDirectorSnapshot DirectorSnapshot;

    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutLifetimeProps) const override;
};
