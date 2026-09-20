#pragma once

#include "CoreMinimal.h"
#include "AbilitySystemInterface.h"
#include "GameFramework/Character.h"
#include "GenesisAbilityCharacter.generated.h"

class UAbilitySystemComponent;
class UGenesisAttributeSet;
class UGameplayAbility;
class UInputAction;
class UInputMappingContext;

UCLASS()
class GENESISGAMEPLAY_API AGenesisAbilityCharacter : public ACharacter, public IAbilitySystemInterface
{
    GENERATED_BODY()

public:
    AGenesisAbilityCharacter();

    virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;

    virtual void BeginPlay() override;
    virtual void PossessedBy(AController* NewController) override;

    UFUNCTION(BlueprintCallable, Category = "Genesis|Abilities")
    void GrantAbility(TSubclassOf<UGameplayAbility> AbilityClass);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Abilities")
    bool ActivateAbilityByClass(TSubclassOf<UGameplayAbility> AbilityClass);

protected:
    UPROPERTY(VisibleDefaultsOnly, BlueprintReadOnly, Category = "Genesis|GAS")
    TObjectPtr<UAbilitySystemComponent> AbilitySystemComponent;

    UPROPERTY(VisibleDefaultsOnly, BlueprintReadOnly, Category = "Genesis|GAS")
    TObjectPtr<UGenesisAttributeSet> AttributeSet;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Genesis|Input")
    TObjectPtr<UInputMappingContext> GameplayMappingContext;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Genesis|Input")
    TObjectPtr<UInputAction> PrimaryAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Genesis|Input")
    TObjectPtr<UInputAction> InteractAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Genesis|Input")
    TObjectPtr<UInputAction> JumpAction;

private:
    void SetupInput();
};
