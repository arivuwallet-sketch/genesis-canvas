#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Engine/DataTable.h"
#include "GameplayTagContainer.h"
#include "GenesisGameData.generated.h"

USTRUCT(BlueprintType)
struct FGenesisStatRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float BaseValue = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float MinValue = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float MaxValue = 100.0f;
};

USTRUCT(BlueprintType)
struct FGenesisAbilityEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSubclassOf<class UGameplayAbility> Ability;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTag InputTag;
};

UCLASS(BlueprintType)
class GENESISGAMEPLAY_API UGenesisGameplayDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
    FName GameplayId;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
    FText DisplayName;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Abilities")
    TArray<FGenesisAbilityEntry> Abilities;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "UI")
    TSoftClassPtr<UUserWidget> HudWidgetClass;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "UI")
    TSoftClassPtr<UUserWidget> MenuWidgetClass;
};
