#include "GenesisMetaProgressionSubsystem.h"

void UGenesisMetaProgressionSubsystem::AddCurrency(int32 Amount)
{
    State.Currency = FMath::Max(0, State.Currency + Amount);
}

void UGenesisMetaProgressionSubsystem::AddXP(int32 Amount)
{
    State.XP = FMath::Max(0, State.XP + Amount);
}

void UGenesisMetaProgressionSubsystem::UnlockTech(const FString& TechId)
{
    if (!TechId.IsEmpty() && !State.UnlockedTech.Contains(TechId))
    {
        State.UnlockedTech.Add(TechId);
    }
}

void UGenesisMetaProgressionSubsystem::AddPersistentItem(
    const FString& ItemId,
    int32 Amount)
{
    if (ItemId.IsEmpty() || Amount <= 0)
        return;

    State.PersistentInventory.FindOrAdd(ItemId) += Amount;
}

void UGenesisMetaProgressionSubsystem::AddPermanentModifier(
    const FString& StatId,
    float Amount)
{
    if (StatId.IsEmpty())
        return;

    State.PermanentModifiers.FindOrAdd(StatId) += Amount;
}

void UGenesisMetaProgressionSubsystem::CommitExtraction(
    int32 Currency,
    int32 XP)
{
    AddCurrency(Currency);
    AddXP(XP);
    ++State.ExtractionStreak;
}
