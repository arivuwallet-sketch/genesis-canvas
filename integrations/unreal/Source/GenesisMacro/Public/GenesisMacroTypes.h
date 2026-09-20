#pragma once

#include "CoreMinimal.h"
#include "GenesisMacroTypes.generated.h"

UENUM(BlueprintType)
enum class EGenesisDirectorPhase : uint8
{
    BuildUp,
    PeakAction,
    Relief
};

UENUM(BlueprintType)
enum class EGenesisMacroLoopStatus : uint8
{
    Active,
    Won,
    Lost,
    Extracted
};

UENUM(BlueprintType)
enum class EGenesisSpawnIntentKind : uint8
{
    SpawnHorde,
    SpawnSafeRoom,
    SpawnSupplies
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisStressTelemetry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Health = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float MaxHealth = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Ammo = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float MaxAmmo = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RecentDamage = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float DamageWindowSeconds = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float TimeSinceCombatSeconds = 30.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 EnemiesNearby = 0;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisDirectorSnapshot
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float StressScore = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    EGenesisDirectorPhase Phase = EGenesisDirectorPhase::BuildUp;

    UPROPERTY(BlueprintReadOnly)
    float PhaseProgress = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float Intensity = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ActionCooldownSeconds = 0.0f;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisSpawnIntent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    EGenesisSpawnIntentKind Kind = EGenesisSpawnIntentKind::SpawnHorde;

    UPROPERTY(BlueprintReadOnly)
    FString SpawnPool;

    UPROPERTY(BlueprintReadOnly)
    int32 Budget = 1;

    UPROPERTY(BlueprintReadOnly)
    FString Reason;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisMacroWorldState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite)
    FString FactionControl = TEXT("neutral");

    UPROPERTY(BlueprintReadWrite)
    float TimeLimitMinutes = 20.0f;

    UPROPERTY(BlueprintReadWrite)
    float TimeRemainingSeconds = 1200.0f;

    UPROPERTY(BlueprintReadWrite)
    FString CurrentLocation = TEXT("start_zone");

    UPROPERTY(BlueprintReadWrite)
    float AlertLevel = 0.2f;

    UPROPERTY(BlueprintReadWrite)
    TMap<FString, bool> WorldFlags;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisMacroRules
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float TimeLimitMinutes = 20.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 TargetScore = 1000;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bExtractionRequired = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bLossOnDeath = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bArtifactRequired = true;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisMetaProgression
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite)
    int32 XP = 0;

    UPROPERTY(BlueprintReadWrite)
    int32 Currency = 0;

    UPROPERTY(BlueprintReadWrite)
    int32 ExtractionStreak = 0;

    UPROPERTY(BlueprintReadWrite)
    TArray<FString> UnlockedTech;

    UPROPERTY(BlueprintReadWrite)
    TMap<FString, int32> PersistentInventory;

    UPROPERTY(BlueprintReadWrite)
    TMap<FString, float> PermanentModifiers;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisQuestObjective
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite)
    FString Id;

    UPROPERTY(BlueprintReadWrite)
    FString Type;

    UPROPERTY(BlueprintReadWrite)
    FString Title;

    UPROPERTY(BlueprintReadWrite)
    FString TargetTag;

    UPROPERTY(BlueprintReadWrite)
    FString LocationTag;

    UPROPERTY(BlueprintReadWrite)
    bool bOptional = false;

    UPROPERTY(BlueprintReadWrite)
    TArray<FString> Prerequisites;

    UPROPERTY(BlueprintReadWrite)
    int32 Reward = 0;
};

USTRUCT(BlueprintType)
struct GENESISM MACRO_API FGenesisQuestGraph
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite)
    FString QuestId;

    UPROPERTY(BlueprintReadWrite)
    FString Title;

    UPROPERTY(BlueprintReadWrite)
    FString RootObjectiveId;

    UPROPERTY(BlueprintReadWrite)
    TArray<FGenesisQuestObjective> Objectives;

    UPROPERTY(BlueprintReadWrite)
    FString GeneratedLocation;

    UPROPERTY(BlueprintReadWrite)
    FString Faction;

    UPROPERTY(BlueprintReadWrite)
    int32 Difficulty = 1;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FGenesisDirectorUpdated,
    FGenesisDirectorSnapshot,
    Snapshot);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FGenesisSpawnIntentRaised,
    FGenesisSpawnIntent,
    Intent);
