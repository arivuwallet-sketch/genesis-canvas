#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GenesisMacroTypes.h"
#include "GenesisMacroGameMode.generated.h"

class UGenesisAIDirectorSubsystem;

UCLASS()
class GENESISMACRO_API AGenesisMacroGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AGenesisMacroGameMode();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void ConfigureLoop(const FGenesisMacroRules& Rules);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void SetWorldState(const FGenesisMacroWorldState& InWorld);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void AddScore(int32 Delta);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void SetPlayerAlive(bool bAlive);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void SetArtifactSecured(bool bSecured);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void SetExtracted(bool bInExtracted);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    void CompleteExtraction(int32 CurrencyReward, int32 XPReward);

    UPROPERTY(BlueprintAssignable, Category = "Genesis|Director")
    FGenesisSpawnIntentRaised OnDirectorSpawnIntent;

protected:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Genesis|Macro")
    FGenesisMacroRules Rules;

    UPROPERTY(BlueprintReadOnly, Category = "Genesis|Macro")
    FGenesisMacroWorldState World;

private:
    UGenesisAIDirectorSubsystem* Director = nullptr;

    void EvaluateRules();
    void HandleDirectorSpawnIntent(FGenesisSpawnIntent Intent);
};
