#include "GenesisAttributeSet.h"

#include "GameplayEffectExtension.h"
#include "Net/UnrealNetwork.h"

UGenesisAttributeSet::UGenesisAttributeSet()
{
    InitMaxHealth(100.0f);
    InitHealth(100.0f);
    InitMaxStamina(100.0f);
    InitStamina(100.0f);
    InitMaxMana(100.0f);
    InitMana(100.0f);
}

void UGenesisAttributeSet::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME_CONDITION_NOTIFY(
        UGenesisAttributeSet,
        Health,
        COND_None,
        REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(
        UGenesisAttributeSet,
        MaxHealth,
        COND_None,
        REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(
        UGenesisAttributeSet,
        Stamina,
        COND_None,
        REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(
        UGenesisAttributeSet,
        MaxStamina,
        COND_None,
        REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(
        UGenesisAttributeSet,
        Mana,
        COND_None,
        REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(
        UGenesisAttributeSet,
        MaxMana,
        COND_None,
        REPNOTIFY_Always);
}

void UGenesisAttributeSet::PreAttributeChange(
    const FGameplayAttribute& Attribute,
    float& NewValue)
{
    Super::PreAttributeChange(Attribute, NewValue);

    if (Attribute == GetHealthAttribute())
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxHealth());

    if (Attribute == GetStaminaAttribute())
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxStamina());

    if (Attribute == GetManaAttribute())
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxMana());

    if (Attribute == GetMaxHealthAttribute())
        NewValue = FMath::Max(1.0f, NewValue);

    if (Attribute == GetMaxStaminaAttribute())
        NewValue = FMath::Max(0.0f, NewValue);

    if (Attribute == GetMaxManaAttribute())
        NewValue = FMath::Max(0.0f, NewValue);
}

void UGenesisAttributeSet::PostGameplayEffectExecute(
    const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);

    if (Data.EvaluatedData.Attribute == GetHealthAttribute())
    {
        SetHealth(FMath::Clamp(
            GetHealth(),
            0.0f,
            GetMaxHealth()));
    }
}

void UGenesisAttributeSet::OnRep_Health(
    const FGameplayAttributeData& OldValue)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(
        UGenesisAttributeSet,
        Health,
        OldValue);
}

void UGenesisAttributeSet::OnRep_MaxHealth(
    const FGameplayAttributeData& OldValue)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(
        UGenesisAttributeSet,
        MaxHealth,
        OldValue);
}

void UGenesisAttributeSet::OnRep_Stamina(
    const FGameplayAttributeData& OldValue)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(
        UGenesisAttributeSet,
        Stamina,
        OldValue);
}

void UGenesisAttributeSet::OnRep_MaxStamina(
    const FGameplayAttributeData& OldValue)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(
        UGenesisAttributeSet,
        MaxStamina,
        OldValue);
}

void UGenesisAttributeSet::OnRep_Mana(
    const FGameplayAttributeData& OldValue)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(
        UGenesisAttributeSet,
        Mana,
        OldValue);
}

void UGenesisAttributeSet::OnRep_MaxMana(
    const FGameplayAttributeData& OldValue)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(
        UGenesisAttributeSet,
        MaxMana,
        OldValue);
}
