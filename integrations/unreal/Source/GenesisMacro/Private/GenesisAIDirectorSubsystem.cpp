#include "GenesisAIDirectorSubsystem.h"

void UGenesisAIDirectorSubsystem::SetTelemetry(
    const FGenesisStressTelemetry& InTelemetry)
{
    Telemetry = InTelemetry;
}

float UGenesisAIDirectorSubsystem::CalculateStress() const
{
    const float HealthStress =
        1.0f - FMath::Clamp(
            Telemetry.Health / FMath::Max(1.0f, Telemetry.MaxHealth),
            0.0f,
            1.0f);

    const float AmmoStress =
        1.0f - FMath::Clamp(
            Telemetry.Ammo / FMath::Max(1.0f, Telemetry.MaxAmmo),
            0.0f,
            1.0f);

    const float DamageStress = FMath::Clamp(
        Telemetry.RecentDamage /
            FMath::Max(1.0f, Telemetry.DamageWindowSeconds),
        0.0f,
        1.0f);

    const float RecencyStress = 1.0f - FMath::Clamp(
        Telemetry.TimeSinceCombatSeconds / 24.0f,
        0.0f,
        1.0f);

    const float PressureStress = FMath::Clamp(
        static_cast<float>(Telemetry.EnemiesNearby) / 8.0f,
        0.0f,
        1.0f);

    return FMath::Clamp(
        HealthStress * HealthWeight +
        AmmoStress * AmmoWeight +
        DamageStress * DamageWeight +
        RecencyStress * RecencyWeight +
        PressureStress * EnemyPressureWeight,
        0.0f,
        1.0f);
}

EGenesisDirectorPhase UGenesisAIDirectorSubsystem::CalculatePhase() const
{
    if (PhaseAgeSeconds < MinPhaseSeconds)
    {
        return Phase;
    }

    const float Normalized =
        FMath::Fmod(ElapsedSeconds, CycleSeconds) /
        FMath::Max(0.01f, CycleSeconds);

    if (Normalized < 0.42f) return EGenesisDirectorPhase::BuildUp;
    if (Normalized < 0.70f) return EGenesisDirectorPhase::PeakAction;
    return EGenesisDirectorPhase::Relief;
}

bool UGenesisAIDirectorSubsystem::BuildSpawnIntent(
    FGenesisSpawnIntent& OutIntent) const
{
    if (Snapshot.StressScore >= CriticalStress)
    {
        OutIntent.Kind = EGenesisSpawnIntentKind::SpawnSafeRoom;
        OutIntent.SpawnPool = TEXT("director_relief_safe_room");
        OutIntent.Budget = 1;
        OutIntent.Reason = TEXT("CriticalStress");
        return true;
    }

    if (Snapshot.StressScore <= HordeThreshold)
    {
        OutIntent.Kind = EGenesisSpawnIntentKind::SpawnHorde;
        OutIntent.SpawnPool = TEXT("director_high_threat_horde");
        OutIntent.Budget = FMath::Max(
            1,
            FMath::RoundToInt(3.0f + Snapshot.Intensity * 8.0f));
        OutIntent.Reason = TEXT("LowStress");
        return true;
    }

    if (Snapshot.Phase == EGenesisDirectorPhase::Relief &&
        Snapshot.StressScore > HordeThreshold &&
        Snapshot.StressScore < ReliefThreshold)
    {
        OutIntent.Kind = EGenesisSpawnIntentKind::SpawnSupplies;
        OutIntent.SpawnPool = TEXT("director_relief_supplies");
        OutIntent.Budget = 1;
        OutIntent.Reason = TEXT("Relief");
        return true;
    }

    return false;
}

FGenesisDirectorSnapshot UGenesisAIDirectorSubsystem::TickDirector(
    float DeltaSeconds)
{
    const float Delta = FMath::Clamp(DeltaSeconds, 0.0f, 0.25f);
    ElapsedSeconds += Delta;
    PhaseAgeSeconds += Delta;
    CooldownSeconds = FMath::Max(0.0f, CooldownSeconds - Delta);

    const EGenesisDirectorPhase NextPhase = CalculatePhase();
    if (NextPhase != Phase)
    {
        Phase = NextPhase;
        PhaseAgeSeconds = 0.0f;
    }

    const float Stress = CalculateStress();
    const float CycleT =
        FMath::Fmod(ElapsedSeconds, CycleSeconds) /
        FMath::Max(0.01f, CycleSeconds);

    const float SineTension =
        (FMath::Sin(CycleT * PI * 2.0f - PI / 2.0f) + 1.0f) * 0.5f;

    float Intensity = 0.0f;
    switch (Phase)
    {
        case EGenesisDirectorPhase::PeakAction:
            Intensity = FMath::Max(SineTension, Stress);
            break;

        case EGenesisDirectorPhase::Relief:
            Intensity = Stress * 0.55f;
            break;

        default:
            Intensity = FMath::Max(Stress * 0.8f, SineTension * 0.75f);
            break;
    }

    Snapshot.StressScore = Stress;
    Snapshot.Phase = Phase;
    Snapshot.PhaseProgress = CycleT;
    Snapshot.Intensity = FMath::Clamp(Intensity, 0.0f, 1.0f);
    Snapshot.ActionCooldownSeconds = CooldownSeconds;

    OnDirectorUpdated.Broadcast(Snapshot);

    if (CooldownSeconds <= 0.0f)
    {
        FGenesisSpawnIntent Intent;
        if (BuildSpawnIntent(Intent))
        {
            CooldownSeconds = ActionCooldownSeconds;
            Snapshot.ActionCooldownSeconds = CooldownSeconds;
            OnSpawnIntent.Broadcast(Intent);
        }
    }

    return Snapshot;
}
