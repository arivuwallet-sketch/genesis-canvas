#pragma once

#include "CoreMinimal.h"
#include "GenesisMacroTypes.h"

struct GENESISMACRO_API FGenesisMacroSaveEnvelope
{
    FGenesisMacroWorldState World;
    FGenesisDirectorSnapshot Director;
    FGenesisMacroRules Rules;
    EGenesisMacroLoopStatus LoopStatus = EGenesisMacroLoopStatus::Active;
    int32 Score = 0;
    bool bPlayerAlive = true;
    bool bExtracted = false;
    bool bArtifactSecured = false;
    FGenesisMetaProgression Meta;
    TArray<FGenesisQuestGraph> Quests;
    TArray<FString> CompletedObjectives;
    FString MidLevelSnapshot;
};

class GENESISMACRO_API FGenesisMacroSaveSerializer
{
public:
    static bool Serialize(
        const FGenesisMacroSaveEnvelope& Snapshot,
        TArray<uint8>& OutCompressed);

    static bool Deserialize(
        const TArray<uint8>& Compressed,
        FGenesisMacroSaveEnvelope& OutSnapshot);
};
