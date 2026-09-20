#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GenesisAbilitySet.generated.h"

class UGameplayAbility;
class UAbilitySystemComponent;

USTRUCT(BlueprintType)
struct FGenesisAbilityGrant
{
    GENERATED_BODY()

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    TSubclassOf<UGameplayAbility> Ability;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    int32 Level = 1;
};

UCLASS(BlueprintType)
class GENESISGAMEPLAY_API UGenesisAbilitySet : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|GAS")
    void GiveTo(UAbilitySystemComponent* AbilitySystemComponent) const;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Abilities")
    TArray<FGenesisAbilityGrant> Grants;
};
