#include "GenesisSmartObjectBridge.h"

#include "SmartObjectSubsystem.h"

bool UGenesisSmartObjectBridge::FindSmartObjects(
    UWorld* World,
    const FSmartObjectRequest& Request,
    TArray<FSmartObjectRequestResult>& Results) const
{
    Results.Reset();

    if (!World)
    {
        return false;
    }

    USmartObjectSubsystem* SmartObjects =
        USmartObjectSubsystem::GetCurrent(World);

    if (!SmartObjects)
    {
        return false;
    }

    return SmartObjects->FindSmartObjects(
        Request,
        Results,
        FConstStructView());
}
