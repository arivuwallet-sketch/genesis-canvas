#include "GenesisMacroSaveSerializer.h"

#include "Misc/Compression.h"
#include "Serialization/MemoryReader.h"
#include "Serialization/MemoryWriter.h"

namespace
{
    constexpr uint32 Magic = 0x47534D31; // GSM1
    constexpr uint8 Version = 1;

    void SerializeMap(FArchive& Ar, TMap<FString, bool>& Map)
    {
        int32 Count = Map.Num();
        Ar << Count;

        if (Ar.IsSaving())
        {
            for (const TPair<FString, bool>& Pair : Map)
            {
                FString Key = Pair.Key;
                bool Value = Pair.Value;
                Ar << Key;
                Ar << Value;
            }
        }
        else
        {
            Map.Empty();
            for (int32 i = 0; i < Count; ++i)
            {
                FString Key;
                bool Value = false;
                Ar << Key;
                Ar << Value;
                Map.Add(Key, Value);
            }
        }
    }

    void SerializeMeta(FArchive& Ar, FGenesisMetaProgression& Meta)
    {
        Ar << Meta.XP;
        Ar << Meta.Currency;
        Ar << Meta.ExtractionStreak;
        Ar << Meta.UnlockedTech;
        Ar << Meta.PersistentInventory;
        Ar << Meta.PermanentModifiers;
    }

    void SerializeObjective(FArchive& Ar, FGenesisQuestObjective& Objective)
    {
        Ar << Objective.Id;
        Ar << Objective.Type;
        Ar << Objective.Title;
        Ar << Objective.TargetTag;
        Ar << Objective.LocationTag;
        Ar << Objective.bOptional;
        Ar << Objective.Prerequisites;
        Ar << Objective.Reward;
    }

    void SerializeQuest(FArchive& Ar, FGenesisQuestGraph& Quest)
    {
        Ar << Quest.QuestId;
        Ar << Quest.Title;
        Ar << Quest.RootObjectiveId;
        Ar << Quest.Objectives;
        Ar << Quest.GeneratedLocation;
        Ar << Quest.Faction;
        Ar << Quest.Difficulty;
    }

    void SerializeSnapshot(FArchive& Ar, FGenesisMacroSaveEnvelope& Snapshot)
    {
        uint32 HeaderMagic = Magic;
        uint8 HeaderVersion = Version;

        Ar << HeaderMagic;
        Ar << HeaderVersion;

        Ar << Snapshot.World.FactionControl;
        Ar << Snapshot.World.TimeLimitMinutes;
        Ar << Snapshot.World.TimeRemainingSeconds;
        Ar << Snapshot.World.CurrentLocation;
        Ar << Snapshot.World.AlertLevel;
        SerializeMap(Ar, Snapshot.World.WorldFlags);

        Ar << Snapshot.Director.StressScore;
        uint8 Phase = static_cast<uint8>(Snapshot.Director.Phase);
        Ar << Phase;
        Ar << Snapshot.Director.PhaseProgress;
        Ar << Snapshot.Director.Intensity;
        Ar << Snapshot.Director.ActionCooldownSeconds;

        Ar << Snapshot.Rules.TimeLimitMinutes;
        Ar << Snapshot.Rules.TargetScore;
        Ar << Snapshot.Rules.bExtractionRequired;
        Ar << Snapshot.Rules.bLossOnDeath;
        Ar << Snapshot.Rules.bArtifactRequired;

        uint8 Status = static_cast<uint8>(Snapshot.LoopStatus);
        Ar << Status;
        Ar << Snapshot.Score;
        Ar << Snapshot.bPlayerAlive;
        Ar << Snapshot.bExtracted;
        Ar << Snapshot.bArtifactSecured;

        SerializeMeta(Ar, Snapshot.Meta);
        Ar << Snapshot.Quests;
        Ar << Snapshot.CompletedObjectives;
        Ar << Snapshot.MidLevelSnapshot;
    }
}

bool FGenesisMacroSaveSerializer::Serialize(
    const FGenesisMacroSaveEnvelope& Snapshot,
    TArray<uint8>& OutCompressed)
{
    TArray<uint8> Raw;
    FMemoryWriter Writer(Raw, true);
    FGenesisMacroSaveEnvelope Copy = Snapshot;
    SerializeSnapshot(Writer, Copy);

    int64 CompressedSize =
        FCompression::CompressMemoryBound(
            NAME_Zlib,
            Raw.Num(),
            COMPRESS_Default,
            0);

    OutCompressed.SetNumUninitialized(static_cast<int32>(CompressedSize));

    if (!FCompression::CompressMemory(
        NAME_Zlib,
        OutCompressed.GetData(),
        CompressedSize,
        Raw.GetData(),
        Raw.Num(),
        COMPRESS_Default,
        0))
    {
        OutCompressed.Reset();
        return false;
    }

    OutCompressed.SetNum(static_cast<int32>(CompressedSize));
    return true;
}

bool FGenesisMacroSaveSerializer::Deserialize(
    const TArray<uint8>& Compressed,
    FGenesisMacroSaveEnvelope& OutSnapshot)
{
    if (Compressed.Num() == 0)
        return false;

    int64 RawSize = 0;
    // The first allocation is bounded and can be enlarged on demand.
    RawSize = FMath::Max<int64>(Compressed.Num() * 8LL, 4096LL);

    for (int Attempt = 0; Attempt < 4; ++Attempt)
    {
        TArray<uint8> Raw;
        Raw.SetNumUninitialized(static_cast<int32>(RawSize));

        if (!FCompression::UncompressMemory(
            NAME_Zlib,
            Raw.GetData(),
            RawSize,
            Compressed.GetData(),
            Compressed.Num(),
            COMPRESS_Default,
            0))
        {
            RawSize *= 2;
            continue;
        }

        FMemoryReader Reader(Raw, true);
        FGenesisMacroSaveEnvelope Candidate = OutSnapshot;
        SerializeSnapshot(Reader, Candidate);

        if (Reader.IsError())
            return false;

        if (static_cast<uint32>(Candidate.Rules.TargetScore) == 0)
            return false;

        OutSnapshot = MoveTemp(Candidate);
        return true;
    }

    return false;
}
