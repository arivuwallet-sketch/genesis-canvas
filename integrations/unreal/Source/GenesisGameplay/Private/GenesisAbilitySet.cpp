#include "GenesisAbilitySet.h"

#include "AbilitySystemComponent.h"
#include "GameplayAbilitySpec.h"

void UGenesisAbilitySet::GiveTo(
    UAbilitySystemComponent* AbilitySystemComponent) const
{
    if (!AbilitySystemComponent || !AbilitySystemComponent->IsOwnerActorAuthoritative())
    {
        return;
    }

    for (const FGenesisAbilityGrant& Grant : Grants)
    {
        if (!Grant.Ability)
        {
            continue;
        }

        AbilitySystemComponent->GiveAbility(
            FGameplayAbilitySpec(
                Grant.Ability,
                FMath::Max(1, Grant.Level)));
    }
}
