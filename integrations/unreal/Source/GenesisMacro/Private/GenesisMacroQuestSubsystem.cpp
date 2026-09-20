#include "GenesisMacroQuestSubsystem.h"

FGenesisQuestGraph UGenesisMacroQuestSubsystem::GenerateQuest(
    const FGenesisMacroWorldState& World,
    int32 Seed)
{
    static const TCHAR* ObjectiveTypes[] =
    {
        TEXT("Fetch"),
        TEXT("Escort"),
        TEXT("Assassinate"),
        TEXT("Defend")
    };

    static const TCHAR* TargetTags[] =
    {
        TEXT("bridge"),
        TEXT("vault"),
        TEXT("supply_cache"),
        TEXT("watchtower"),
        TEXT("convoy")
    };

    FGenesisQuestGraph Quest;
    Quest.GeneratedLocation = World.CurrentLocation;
    Quest.Faction = World.FactionControl.IsEmpty()
        ? TEXT("neutral")
        : World.FactionControl;
    Quest.Difficulty = FMath::Clamp(
        FMath::RoundToInt(World.AlertLevel * 8.0f + 2.0f),
        1,
        10);

    const int32 Count = World.TimeLimitMinutes >= 30.0f ? 4 : 3;

    Quest.QuestId = FString::Printf(
        TEXT("quest_%d_%s"),
        Seed,
        *World.CurrentLocation);

    Quest.Title = FString::Printf(
        TEXT("%s operation: %s"),
        *Quest.Faction,
        *World.CurrentLocation);

    for (int32 Index = 0; Index < Count; ++Index)
    {
        const int32 TypeIndex = FMath::Abs(Seed + Index * 3) % UE_ARRAY_COUNT(ObjectiveTypes);
        const int32 TargetIndex = FMath::Abs(Seed + Index) % UE_ARRAY_COUNT(TargetTags);

        FGenesisQuestObjective Objective;
        Objective.Id = FString::Printf(
            TEXT("objective_%d_%d"),
            Seed,
            Index);

        Objective.Type = ObjectiveTypes[TypeIndex];
        Objective.TargetTag = TargetIndex == 0 && Objective.Type == TEXT("Assassinate")
            ? Quest.Faction + TEXT(":commander")
            : TargetTags[TargetIndex];

        Objective.LocationTag = World.CurrentLocation;
        Objective.bOptional = Index == Count - 1 && Quest.Difficulty < 7;
        Objective.Reward = 100 * Quest.Difficulty + Index * 50;

        if (Index > 0)
        {
            Objective.Prerequisites.Add(
                FString::Printf(TEXT("objective_%d_%d"), Seed, Index - 1));
        }

        if (Objective.Type == TEXT("Fetch"))
        {
            Objective.Title = FString::Printf(
                TEXT("Recover the %s"),
                Objective.TargetTag.IsEmpty() ? TEXT("target") : *Objective.TargetTag);
        }
        else if (Objective.Type == TEXT("Escort"))
        {
            Objective.Title = FString::Printf(
                TEXT("Escort the %s"),
                *Objective.TargetTag);
        }
        else if (Objective.Type == TEXT("Assassinate"))
        {
            Objective.Title = FString::Printf(
                TEXT("Eliminate the %s commander"),
                *Quest.Faction);
        }
        else
        {
            Objective.Title = FString::Printf(
                TEXT("Defend the %s"),
                *Objective.TargetTag);
        }

        Quest.Objectives.Add(Objective);
    }

    if (Quest.Objectives.Num() > 0)
        Quest.RootObjectiveId = Quest.Objectives[0].Id;

    ActiveQuests.Add(Quest);
    return Quest;
}

bool UGenesisMacroQuestSubsystem::CompleteObjective(
    const FString& ObjectiveId)
{
    if (ObjectiveId.IsEmpty() || CompletedObjectives.Contains(ObjectiveId))
        return false;

    CompletedObjectives.Add(ObjectiveId);
    return true;
}

TArray<FString> UGenesisMacroQuestSubsystem::PlanFactionGoal(
    const FString& Faction,
    const TArray<FString>& DesiredFacts)
{
    TArray<FString> Plan;

    for (const FString& Fact : DesiredFacts)
    {
        if (!Fact.IsEmpty())
        {
            Plan.Add(
                FString::Printf(
                    TEXT("%s: establish %s"),
                    *Faction,
                    *Fact));
        }
    }

    return Plan;
}
