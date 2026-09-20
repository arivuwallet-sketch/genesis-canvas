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
            static_cast<int64>(Raw.Num()),
            COMPRESS_Default,
            0);

    const int32 HeaderBytes = sizeof(uint32) + sizeof(uint8) + sizeof(uint32);
    OutCompressed.SetNumUninitialized(
        HeaderBytes + static_cast<int32>(CompressedSize));

    uint32 HeaderMagic = Magic;
    uint8 HeaderVersion = Version;
    uint32 RawSize = static_cast<uint32>(Raw.Num());

    FMemory::Memcpy(OutCompressed.GetData(), &HeaderMagic, sizeof(uint32));
    FMemory::Memcpy(
        OutCompressed.GetData() + sizeof(uint32),
        &HeaderVersion,
        sizeof(uint8));
    FMemory::Memcpy(
        OutCompressed.GetData() + sizeof(uint32) + sizeof(uint8),
        &RawSize,
        sizeof(uint32));

    void* Destination =
        OutCompressed.GetData() + HeaderBytes;

    int64 ActualCompressedSize = CompressedSize;
    if (!FCompression::CompressMemory(
        NAME_Zlib,
        Destination,
        ActualCompressedSize,
        Raw.GetData(),
        Raw.Num(),
        COMPRESS_Default,
        0))
    {
        OutCompressed.Reset();
        return false;
    }

    OutCompressed.SetNum(HeaderBytes + static_cast<int32>(ActualCompressedSize));
    return true;
}

bool FGenesisMacroSaveSerializer::Deserialize(
    const TArray<uint8>& Compressed,
    FGenesisMacroSaveEnvelope& OutSnapshot)
{
    constexpr int32 HeaderBytes = sizeof(uint32) + sizeof(uint8) + sizeof(uint32);
    if (Compressed.Num() <= HeaderBytes)
        return false;

    uint32 HeaderMagic = 0;
    uint8 HeaderVersion = 0;
    uint32 RawSize = 0;

    FMemory::Memcpy(
        &HeaderMagic,
        Compressed.GetData(),
        sizeof(uint32));
    FMemory::Memcpy(
        &HeaderVersion,
        Compressed.GetData() + sizeof(uint32),
        sizeof(uint8));
    FMemory::Memcpy(
        &RawSize,
        Compressed.GetData() + sizeof(uint32) + sizeof(uint8),
        sizeof(uint32));

    if (HeaderMagic != Magic || HeaderVersion != Version || RawSize == 0)
        return false;

    TArray<uint8> Raw;
    Raw.SetNumUninitialized(static_cast<int32>(RawSize));

    const void* Source = Compressed.GetData() + HeaderBytes;
    const int32 SourceSize = Compressed.Num() - HeaderBytes;

    int64 UncompressedSize = RawSize;
    if (!FCompression::UncompressMemory(
        NAME_Zlib,
        Raw.GetData(),
        UncompressedSize,
        Source,
        SourceSize,
        COMPRESS_Default,
        0))
    {
        return false;
    }

    FMemoryReader Reader(Raw, true);
    FGenesisMacroSaveEnvelope Candidate = OutSnapshot;
    SerializeSnapshot(Reader, Candidate);

    if (Reader.IsError())
        return false;

    if (Candidate.Rules.TargetScore <= 0)
        return false;

    OutSnapshot = MoveTemp(Candidate);
    return true;
}
