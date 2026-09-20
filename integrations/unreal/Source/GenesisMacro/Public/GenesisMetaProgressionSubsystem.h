#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "GenesisMacroTypes.h"
#include "GenesisMetaProgressionSubsystem.generated.h"

UCLASS()
class GENESISMACRO_API UGenesisMetaProgressionSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintReadOnly, Category = "Genesis|Meta")
    FGenesisMetaProgression State;

    UFUNCTION(BlueprintCallable, Category = "Genesis|Meta")
    void AddCurrency(int32 Amount);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Meta")
    void AddXP(int32 Amount);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Meta")
    void UnlockTech(const FString& TechId);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Meta")
    void AddPersistentItem(const FString& ItemId, int32 Amount);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Meta")
    void AddPermanentModifier(const FString& StatId, float Amount);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Meta")
    void CommitExtraction(int32 Currency, int32 XP);
};
