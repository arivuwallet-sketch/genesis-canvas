#include "GenesisInputRouter.h"

#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputAction.h"
#include "InputActionValue.h"
#include "InputMappingContext.h"
#include "GameFramework/PlayerController.h"

UGenesisInputRouter::UGenesisInputRouter()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UGenesisInputRouter::BeginPlay()
{
    Super::BeginPlay();
    RebuildMappings();

    if (APlayerController* Controller =
            Cast<APlayerController>(GetOwner()->GetInstigatorController()))
    {
        if (UEnhancedInputComponent* Input =
                Cast<UEnhancedInputComponent>(Controller->InputComponent))
        {
            if (MoveAction)
                Input->BindAction(
                    MoveAction,
                    ETriggerEvent::Triggered,
                    this,
                    &ThisClass::HandleMove);

            if (PrimaryAction)
                Input->BindAction(
                    PrimaryAction,
                    ETriggerEvent::Started,
                    this,
                    &ThisClass::HandlePrimary);

            if (InteractAction)
                Input->BindAction(
                    InteractAction,
                    ETriggerEvent::Started,
                    this,
                    &ThisClass::HandleInteract);
        }
    }
}

void UGenesisInputRouter::SetInputContext(EGenesisInputContext Context)
{
    CurrentContext = Context;
    RebuildMappings();
}

void UGenesisInputRouter::RebuildMappings()
{
    APlayerController* Controller =
        Cast<APlayerController>(GetOwner()->GetInstigatorController());

    if (!Controller)
    {
        return;
    }

    ULocalPlayer* LocalPlayer = Controller->GetLocalPlayer();
    if (!LocalPlayer)
    {
        return;
    }

    UEnhancedInputLocalPlayerSubsystem* InputSubsystem =
        LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>();

    if (!InputSubsystem)
    {
        return;
    }

    InputSubsystem->ClearAllMappings();

    switch (CurrentContext)
    {
        case EGenesisInputContext::Locomotion:
            if (LocomotionContext)
                InputSubsystem->AddMappingContext(LocomotionContext, 0);
            break;

        case EGenesisInputContext::Driving:
            if (DrivingContext)
                InputSubsystem->AddMappingContext(DrivingContext, 0);
            break;

        case EGenesisInputContext::Menu:
            if (MenuContext)
                InputSubsystem->AddMappingContext(MenuContext, 100);
            break;
    }
}

void UGenesisInputRouter::HandleMove(const FInputActionValue& Value)
{
    OnMove.Broadcast(Value.Get<FVector2D>());
}

void UGenesisInputRouter::HandlePrimary(const FInputActionValue& Value)
{
    OnPrimary.Broadcast();
}

void UGenesisInputRouter::HandleInteract(const FInputActionValue& Value)
{
    OnInteract.Broadcast();
}
