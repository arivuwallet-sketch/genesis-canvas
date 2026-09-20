#pragma once

#include "CoreMinimal.h"
#include "Abilities/GameplayAbility.h"
#include "GenesisAbilities.generated.h"

UCLASS()
class GENESISGAMEPLAY_API UGenesisGameplayAbility : public UGameplayAbility
{
    GENERATED_BODY()

public:
    UGenesisGameplayAbility();
};

UCLASS()
class GENESISGAMEPLAY_API UGenesisAbility_DoubleJump : public UGenesisGameplayAbility
{
    GENERATED_BODY()

public:
    UGenesisAbility_DoubleJump();

protected:
    virtual void ActivateAbility(
        const FGameplayAbilitySpecHandle Handle,
        const FGameplayAbilityActorInfo* ActorInfo,
        const FGameplayAbilityActivationInfo ActivationInfo,
        const FGameplayEventData* TriggerEventData) override;
};

UCLASS()
class GENESISGAMEPLAY_API UGenesisAbility_Interact : public UGenesisGameplayAbility
{
    GENERATED_BODY()

public:
    UGenesisAbility_Interact();

protected:
    virtual void ActivateAbility(
        const FGameplayAbilitySpecHandle Handle,
        const FGameplayAbilityActorInfo* ActorInfo,
        const FGameplayAbilityActivationInfo ActivationInfo,
        const FGameplayEventData* TriggerEventData) override;
};
