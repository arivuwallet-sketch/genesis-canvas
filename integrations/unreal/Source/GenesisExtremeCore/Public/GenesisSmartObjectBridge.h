#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "SmartObjectTypes.h"
#include "GenesisSmartObjectBridge.generated.h"

UCLASS()
class GENESISEXTREMECORE_API UGenesisSmartObjectBridge : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|SmartObjects")
    bool FindSmartObjects(
        UWorld* World,
        const FSmartObjectRequest& Request,
        TArray<FSmartObjectRequestResult>& Results) const;
};
