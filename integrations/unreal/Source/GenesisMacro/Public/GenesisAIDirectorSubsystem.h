#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "GenesisMacroTypes.h"
#include "GenesisAIDirectorSubsystem.generated.h"

UCLASS()
class GENESISMACRO_API UGenesisAIDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|Director")
    void SetTelemetry(const FGenesisStressTelemetry& InTelemetry);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Director")
    FGenesisDirectorSnapshot TickDirector(float DeltaSeconds);

    UPROPERTY(BlueprintAssignable, Category = "Genesis|Director")
    FGenesisDirectorUpdated OnDirectorUpdated;

    UPROPERTY(BlueprintAssignable, Category = "Genesis|Director")
    FGenesisSpawnIntentRaised OnSpawnIntent;

    UPROPERTY(BlueprintReadOnly, Category = "Genesis|Director")
    FGenesisDirectorSnapshot Snapshot;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float HealthWeight = 0.34f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float AmmoWeight = 0.18f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float DamageWeight = 0.20f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float RecencyWeight = 0.12f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float EnemyPressureWeight = 0.16f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float CycleSeconds = 54.0f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float MinPhaseSeconds = 8.0f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float CriticalStress = 0.82f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float HordeThreshold = 0.34f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float ReliefThreshold = 0.68f;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Director")
    float ActionCooldownSeconds = 10.0f;

private:
    FGenesisStressTelemetry Telemetry;
    float ElapsedSeconds = 0.0f;
    float PhaseAgeSeconds = 0.0f;
    float CooldownSeconds = 0.0f;
    EGenesisDirectorPhase Phase = EGenesisDirectorPhase::BuildUp;

    float CalculateStress() const;
    EGenesisDirectorPhase CalculatePhase() const;
    bool BuildSpawnIntent(FGenesisSpawnIntent& OutIntent) const;
};
