#pragma once

#include "CoreMinimal.h"
#include "CommonUserWidget.h"
#include "GenesisCommonHud.generated.h"

UCLASS(Abstract, Blueprintable)
class GENESISGAMEPLAY_API UGenesisCommonHud : public UCommonUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|HUD")
    void SetHealthNormalized(float Value);

    UFUNCTION(BlueprintCallable, Category = "Genesis|HUD")
    void SetStaminaNormalized(float Value);

    UFUNCTION(BlueprintCallable, Category = "Genesis|HUD")
    void SetManaNormalized(float Value);

protected:
    UPROPERTY(BlueprintReadOnly, Category = "Genesis|HUD")
    float HealthNormalized = 1.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Genesis|HUD")
    float StaminaNormalized = 1.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Genesis|HUD")
    float ManaNormalized = 1.0f;

    UFUNCTION(BlueprintImplementableEvent, Category = "Genesis|HUD")
    void OnHudStateChanged();
};
