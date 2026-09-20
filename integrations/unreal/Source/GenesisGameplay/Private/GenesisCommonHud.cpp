#include "GenesisCommonHud.h"

void UGenesisCommonHud::SetHealthNormalized(float Value)
{
    HealthNormalized = FMath::Clamp(Value, 0.0f, 1.0f);
    OnHudStateChanged();
}

void UGenesisCommonHud::SetStaminaNormalized(float Value)
{
    StaminaNormalized = FMath::Clamp(Value, 0.0f, 1.0f);
    OnHudStateChanged();
}

void UGenesisCommonHud::SetManaNormalized(float Value)
{
    ManaNormalized = FMath::Clamp(Value, 0.0f, 1.0f);
    OnHudStateChanged();
}
