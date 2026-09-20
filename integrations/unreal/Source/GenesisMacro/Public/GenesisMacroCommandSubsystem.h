#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "GenesisMacroCommandSubsystem.generated.h"

UCLASS()
class GENESISMACRO_API UGenesisMacroCommandSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|Macro")
    bool ExecuteJson(const FString& Json);

private:
    bool ExecuteGenerateGameLoop(const TSharedPtr<class FJsonObject>& Payload);
    bool ExecuteSetWorldState(const TSharedPtr<class FJsonObject>& Payload);
};
