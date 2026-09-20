#include "GenesisAbilityCharacter.h"

#include "AbilitySystemComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GenesisAttributeSet.h"
#include "GameplayAbilitySpec.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputActionValue.h"

AGenesisAbilityCharacter::AGenesisAbilityCharacter()
{
    PrimaryActorTick.bCanEverTick = false;

    AbilitySystemComponent =
        CreateDefaultSubobject<UAbilitySystemComponent>(TEXT("AbilitySystemComponent"));

    AttributeSet =
        CreateDefaultSubobject<UGenesisAttributeSet>(TEXT("AttributeSet"));
}

UAbilitySystemComponent* AGenesisAbilityCharacter::GetAbilitySystemComponent() const
{
    return AbilitySystemComponent;
}

void AGenesisAbilityCharacter::BeginPlay()
{
    Super::BeginPlay();

    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->InitAbilityActorInfo(this, this);
    }

    SetupInput();
}

void AGenesisAbilityCharacter::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);

    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->InitAbilityActorInfo(this, this);
    }
}

void AGenesisAbilityCharacter::GrantAbility(
    TSubclassOf<UGameplayAbility> AbilityClass)
{
    if (!HasAuthority() || !AbilityClass || !AbilitySystemComponent)
    {
        return;
    }

    AbilitySystemComponent->GiveAbility(
        FGameplayAbilitySpec(AbilityClass, 1));
}

bool AGenesisAbilityCharacter::ActivateAbilityByClass(
    TSubclassOf<UGameplayAbility> AbilityClass)
{
    if (!AbilityClass || !AbilitySystemComponent)
    {
        return false;
    }

    return AbilitySystemComponent->TryActivateAbilityByClass(AbilityClass);
}

void AGenesisAbilityCharacter::SetupInput()
{
    APlayerController* PlayerController =
        Cast<APlayerController>(GetController());

    if (!PlayerController || !GameplayMappingContext)
    {
        return;
    }

    if (ULocalPlayer* LocalPlayer = PlayerController->GetLocalPlayer())
    {
        if (UEnhancedInputLocalPlayerSubsystem* InputSubsystem =
                LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
        {
            InputSubsystem->AddMappingContext(GameplayMappingContext, 0);
        }
    }

    if (UEnhancedInputComponent* EnhancedInput =
            Cast<UEnhancedInputComponent>(InputComponent))
    {
        if (PrimaryAction)
        {
            EnhancedInput->BindAction(
                PrimaryAction,
                ETriggerEvent::Started,
                this,
                &ThisClass::HandlePrimaryInput);
        }

        if (InteractAction)
        {
            EnhancedInput->BindAction(
                InteractAction,
                ETriggerEvent::Started,
                this,
                &ThisClass::HandleInteractInput);
        }

        if (JumpAction)
        {
            EnhancedInput->BindAction(
                JumpAction,
                ETriggerEvent::Started,
                this,
                &ThisClass::HandleJumpInput);
        }
    }
}

void AGenesisAbilityCharacter::HandlePrimaryInput(
    const FInputActionValue& Value)
{
    if (PrimaryAction)
    {
        if (UAbilitySystemComponent* ASC = GetAbilitySystemComponent())
        {
            const FGameplayTag Tag = FGameplayTag::RequestGameplayTag(
                TEXT("Ability.Primary"));
            ASC->TryActivateAbilitiesByTag(
                FGameplayTagContainer(Tag),
                true);
        }
    }
}

void AGenesisAbilityCharacter::HandleInteractInput(
    const FInputActionValue& Value)
{
    if (InteractAction)
    {
        if (UAbilitySystemComponent* ASC = GetAbilitySystemComponent())
        {
            const FGameplayTag Tag = FGameplayTag::RequestGameplayTag(
                TEXT("Ability.Interact"));
            ASC->TryActivateAbilitiesByTag(
                FGameplayTagContainer(Tag),
                true);
        }
    }
}

void AGenesisAbilityCharacter::HandleJumpInput(
    const FInputActionValue& Value)
{
    Jump();
}
