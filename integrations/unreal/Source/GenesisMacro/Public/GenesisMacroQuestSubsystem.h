#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "GenesisMacroTypes.h"
#include "GenesisMacroQuestSubsystem.generated.h"

UCLASS()
class GENESISMACRO_API UGenesisMacroQuestSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|Quests")
    FGenesisQuestGraph GenerateQuest(
        const FGenesisMacroWorldState& World,
        int32 Seed);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Quests")
    bool CompleteObjective(const FString& ObjectiveId);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Quests")
    TArray<FString> PlanFactionGoal(
        const FString& Faction,
        const TArray<FString>& DesiredFacts);

    UPROPERTY(BlueprintReadOnly, Category = "Genesis|Quests")
    TArray<FGenesisQuestGraph> ActiveQuests;

    UPROPERTY(BlueprintReadOnly, Category = "Genesis|Quests")
    TArray<FString> CompletedObjectives;
};
