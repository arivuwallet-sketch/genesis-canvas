#include "GenesisAbilities.h"

#include "GameFramework/Character.h"

UGenesisGameplayAbility::UGenesisGameplayAbility()
{
    InstancingPolicy = EGameplayAbilityInstancingPolicy::InstancedPerActor;
}

UGenesisAbility_DoubleJump::UGenesisAbility_DoubleJump()
{
    AbilityTags.AddTag(FGameplayTag::RequestGameplayTag(TEXT("Ability.Movement.DoubleJump")));
}

void UGenesisAbility_DoubleJump::ActivateAbility(
    const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayAbilityActivationInfo ActivationInfo,
    const FGameplayEventData* TriggerEventData)
{
    ACharacter* Character = Cast<ACharacter>(ActorInfo ? ActorInfo->AvatarActor.Get() : nullptr);

    if (Character && !Character->GetCharacterMovement()->IsMovingOnGround())
    {
        Character->LaunchCharacter(
            FVector(0.0f, 0.0f, 420.0f),
            false,
            true);
    }

    EndAbility(Handle, ActorInfo, ActivationInfo, true, false);
}

UGenesisAbility_Interact::UGenesisAbility_Interact()
{
    AbilityTags.AddTag(FGameplayTag::RequestGameplayTag(TEXT("Ability.Interact")));
}

void UGenesisAbility_Interact::ActivateAbility(
    const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayAbilityActivationInfo ActivationInfo,
    const FGameplayEventData* TriggerEventData)
{
    // Project-specific interaction targets consume the Ability.Interact tag.
    EndAbility(Handle, ActorInfo, ActivationInfo, true, false);
}
