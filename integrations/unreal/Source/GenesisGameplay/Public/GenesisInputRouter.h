#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GenesisInputRouter.generated.h"

class UInputMappingContext;
class UInputAction;
struct FInputActionValue;

UENUM(BlueprintType)
enum class EGenesisInputContext : uint8
{
    Locomotion,
    Driving,
    Menu
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FGenesisMoveInput,
    FVector2D,
    Value);

DECLARE_DYNAMIC_MULTICAST_DELEGATE(
    FGenesisButtonInput);

UCLASS(ClassGroup = (Genesis), meta = (BlueprintSpawnableComponent))
class GENESISGAMEPLAY_API UGenesisInputRouter : public UActorComponent
{
    GENERATED_BODY()

public:
    UGenesisInputRouter();

    virtual void BeginPlay() override;

    UFUNCTION(BlueprintCallable, Category = "Genesis|Input")
    void SetInputContext(EGenesisInputContext Context);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Input")
    EGenesisInputContext GetInputContext() const { return CurrentContext; }

    UPROPERTY(BlueprintAssignable, Category = "Genesis|Input")
    FGenesisMoveInput OnMove;

    UPROPERTY(BlueprintAssignable, Category = "Genesis|Input")
    FGenesisButtonInput OnPrimary;

    UPROPERTY(BlueprintAssignable, Category = "Genesis|Input")
    FGenesisButtonInput OnInteract;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Input")
    TObjectPtr<UInputMappingContext> LocomotionContext;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Input")
    TObjectPtr<UInputMappingContext> DrivingContext;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Input")
    TObjectPtr<UInputMappingContext> MenuContext;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Input")
    TObjectPtr<UInputAction> PrimaryAction;

    UPROPERTY(EditDefaultsOnly, Category = "Genesis|Input")
    TObjectPtr<UInputAction> InteractAction;

private:
    EGenesisInputContext CurrentContext = EGenesisInputContext::Locomotion;

    void RebuildMappings();
    void HandleMove(const FInputActionValue& Value);
    void HandlePrimary(const FInputActionValue& Value);
    void HandleInteract(const FInputActionValue& Value);
};
