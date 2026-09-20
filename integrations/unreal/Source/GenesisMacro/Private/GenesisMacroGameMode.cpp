#include "GenesisMacroGameMode.h"

#include "GenesisAIDirectorSubsystem.h"
#include "GenesisMacroGameState.h"
#include "Engine/GameInstance.h"

AGenesisMacroGameMode::AGenesisMacroGameMode()
{
    PrimaryActorTick.bCanEverTick = true;
    GameStateClass = AGenesisMacroGameState::StaticClass();
}

void AGenesisMacroGameMode::BeginPlay()
{
    Super::BeginPlay();

    World.FactionControl = TEXT("neutral");
    World.CurrentLocation = TEXT("start_zone");
    World.TimeLimitMinutes = Rules.TimeLimitMinutes;
    World.TimeRemainingSeconds = Rules.TimeLimitMinutes * 60.0f;

    if (UGameInstance* GameInstance = GetGameInstance())
    {
        Director = GameInstance->GetSubsystem<UGenesisAIDirectorSubsystem>();
        if (Director)
        {
            Director->OnSpawnIntent.AddDynamic(
                this,
                &ThisClass::HandleDirectorSpawnIntent);
        }
    }
}

void AGenesisMacroGameMode::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>();
    if (!GS || GS->LoopStatus != EGenesisMacroLoopStatus::Active)
    {
        return;
    }

    const float Delta = FMath::Min(DeltaSeconds, 0.25f);
    World.TimeRemainingSeconds = FMath::Max(
        0.0f,
        World.TimeRemainingSeconds - Delta);

    if (Director)
    {
        GS->DirectorSnapshot = Director->TickDirector(Delta);
    }

    GS->TimeRemainingSeconds = World.TimeRemainingSeconds;
    GS->Score = GS->Score;
    GS->bPlayerAlive = GS->bPlayerAlive;
    GS->bArtifactSecured = GS->bArtifactSecured;
    GS->bExtracted = GS->bExtracted;

    EvaluateRules();
}

void AGenesisMacroGameMode::SetWorldState(const FGenesisMacroWorldState& InWorld)
{
    World = InWorld;
    if (AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>())
    {
        GS->TimeRemainingSeconds = World.TimeRemainingSeconds;
    }
}

void AGenesisMacroGameMode::ConfigureLoop(const FGenesisMacroRules& InRules)
{
    Rules = InRules;
    World.TimeLimitMinutes = Rules.TimeLimitMinutes;
    World.TimeRemainingSeconds = Rules.TimeLimitMinutes * 60.0f;

    if (AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>())
    {
        GS->LoopStatus = EGenesisMacroLoopStatus::Active;
        GS->Score = 0;
        GS->bPlayerAlive = true;
        GS->bArtifactSecured = false;
        GS->bExtracted = false;
        GS->TimeRemainingSeconds = World.TimeRemainingSeconds;
    }
}

void AGenesisMacroGameMode::AddScore(int32 Delta)
{
    if (AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>())
    {
        GS->Score = FMath::Max(0, GS->Score + Delta);
        EvaluateRules();
    }
}

void AGenesisMacroGameMode::SetPlayerAlive(bool bAlive)
{
    if (AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>())
    {
        GS->bPlayerAlive = bAlive;
        EvaluateRules();
    }
}

void AGenesisMacroGameMode::SetArtifactSecured(bool bSecured)
{
    if (AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>())
    {
        GS->bArtifactSecured = bSecured;
    }
}

void AGenesisMacroGameMode::SetExtracted(bool bInExtracted)
{
    if (AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>())
    {
        GS->bExtracted = bInExtracted;
        EvaluateRules();
    }
}

void AGenesisMacroGameMode::CompleteExtraction(
    int32 CurrencyReward,
    int32 XPReward)
{
    SetExtracted(true);
    // Meta currency/XP is persisted by the GameInstance subsystem in production.
    UE_LOG(
        LogTemp,
        Log,
        TEXT("[GenesisMacro] Extraction reward currency=%d xp=%d"),
        CurrencyReward,
        XPReward);
}

void AGenesisMacroGameMode::EvaluateRules()
{
    AGenesisMacroGameState* GS = GetGameState<AGenesisMacroGameState>();
    if (!GS || GS->LoopStatus != EGenesisMacroLoopStatus::Active)
    {
        return;
    }

    const bool bWon =
        GS->bExtracted &&
        GS->Score >= Rules.TargetScore &&
        (!Rules.bExtractionRequired || GS->bExtracted) &&
        (!Rules.bArtifactRequired || GS->bArtifactSecured);

    const bool bLost =
        (Rules.bLossOnDeath && !GS->bPlayerAlive) ||
        (!bWon && GS->TimeRemainingSeconds <= 0.0f);

    GS->LoopStatus =
        bWon
            ? EGenesisMacroLoopStatus::Won
            : bLost
                ? EGenesisMacroLoopStatus::Lost
                : GS->bExtracted
                    ? EGenesisMacroLoopStatus::Extracted
                    : EGenesisMacroLoopStatus::Active;
}

void AGenesisMacroGameMode::HandleDirectorSpawnIntent(
    FGenesisSpawnIntent Intent)
{
    // Macro layer only selects an abstract spawn pool. The mid-level spawn
    // service resolves the pool to actual spawn points/encounters.
    OnDirectorSpawnIntent.Broadcast(Intent);
}
