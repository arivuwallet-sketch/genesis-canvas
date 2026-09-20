#pragma once

#include "CoreMinimal.h"
#include "AttributeSet.h"
#include "AbilitySystemComponent.h"
#include "GenesisAttributeSet.generated.h"

#define ATTRIBUTE_ACCESSORS(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)

UCLASS()
class GENESISGAMEPLAY_API UGenesisAttributeSet : public UAttributeSet
{
    GENERATED_BODY()

public:
    UGenesisAttributeSet();

    ATTRIBUTE_ACCESSORS(UGenesisAttributeSet, Health)
    ATTRIBUTE_ACCESSORS(UGenesisAttributeSet, MaxHealth)
    ATTRIBUTE_ACCESSORS(UGenesisAttributeSet, Stamina)
    ATTRIBUTE_ACCESSORS(UGenesisAttributeSet, MaxStamina)
    ATTRIBUTE_ACCESSORS(UGenesisAttributeSet, Mana)
    ATTRIBUTE_ACCESSORS(UGenesisAttributeSet, MaxMana)

    virtual void GetLifetimeReplicatedProps(
        TArray<FLifetimeProperty>& OutLifetimeProps) const override;

protected:
    virtual void PreAttributeChange(
        const FGameplayAttribute& Attribute,
        float& NewValue) override;

    virtual void PostGameplayEffectExecute(
        const FGameplayEffectModCallbackData& Data) override;

private:
    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Health, Category = "Attributes", meta = (AllowPrivateAccess = "true"))
    FGameplayAttributeData Health;

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxHealth, Category = "Attributes", meta = (AllowPrivateAccess = "true"))
    FGameplayAttributeData MaxHealth;

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Stamina, Category = "Attributes", meta = (AllowPrivateAccess = "true"))
    FGameplayAttributeData Stamina;

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxStamina, Category = "Attributes", meta = (AllowPrivateAccess = "true"))
    FGameplayAttributeData MaxStamina;

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Mana, Category = "Attributes", meta = (AllowPrivateAccess = "true"))
    FGameplayAttributeData Mana;

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxMana, Category = "Attributes", meta = (AllowPrivateAccess = "true"))
    FGameplayAttributeData MaxMana;

    UFUNCTION() void OnRep_Health(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxHealth(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_Stamina(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxStamina(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_Mana(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxMana(const FGameplayAttributeData& OldValue);
};
