#include "GenesisMacroCommandSubsystem.h"

#include "GenesisMacroGameMode.h"
#include "GenesisMacroTypes.h"
#include "Engine/World.h"
#include "GameFramework/GameModeBase.h"
#include "JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace
{
    bool GetString(
        const TSharedPtr<FJsonObject>& Object,
        const TCHAR* Name,
        FString& OutValue)
    {
        return Object.IsValid() && Object->TryGetStringField(Name, OutValue);
    }

    bool GetNumber(
        const TSharedPtr<FJsonObject>& Object,
        const TCHAR* Name,
        double& OutValue)
    {
        return Object.IsValid() && Object->TryGetNumberField(Name, OutValue);
    }
}

bool UGenesisMacroCommandSubsystem::ExecuteJson(const FString& Json)
{
    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader =
        TJsonReaderFactory<>::Create(Json);

    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        return false;
    }

    const TArray<TSharedPtr<FJsonValue>>* Commands = nullptr;
    if (!Root->TryGetArrayField(TEXT("commands"), Commands) ||
        !Commands ||
        Commands->Num() > 16)
    {
        return false;
    }

    bool bExecuted = false;

    for (const TSharedPtr<FJsonValue>& Value : *Commands)
    {
        const TSharedPtr<FJsonObject> Command = Value.IsValid()
            ? Value->AsObject()
            : nullptr;

        if (!Command.IsValid())
            continue;

        FString Name;
        if (!GetString(Command, TEXT("command"), Name))
            continue;

        const TSharedPtr<FJsonObject>* PayloadPtr = nullptr;
        if (!Command->TryGetObjectField(TEXT("payload"), PayloadPtr) ||
            !PayloadPtr ||
            !PayloadPtr->IsValid())
        {
            continue;
        }

        if (Name == TEXT("GenerateGameLoop"))
        {
            bExecuted |= ExecuteGenerateGameLoop(*PayloadPtr);
        }
        else if (Name == TEXT("SetWorldState"))
        {
            bExecuted |= ExecuteSetWorldState(*PayloadPtr);
        }
    }

    return bExecuted;
}

bool UGenesisMacroCommandSubsystem::ExecuteGenerateGameLoop(
    const TSharedPtr<FJsonObject>& Payload)
{
    AGenesisMacroGameMode* GameMode =
        GetWorld() ? GetWorld()->GetAuthGameMode<AGenesisMacroGameMode>() : nullptr;

    if (!GameMode || !Payload.IsValid())
        return false;

    FString Genre;
    FString WinCondition;

    if (!GetString(Payload, TEXT("genre"), Genre) ||
        !GetString(Payload, TEXT("win_condition"), WinCondition))
    {
        return false;
    }

    FGenesisMacroRules Rules;

    const FString GenreLower = Genre.ToLower();
    const FString WinLower = WinCondition.ToLower();

    Rules.TimeLimitMinutes =
        GenreLower.Contains(TEXT("extraction"))
            ? 20.0f
            : 30.0f;

    Rules.TargetScore =
        GenreLower.Contains(TEXT("shooter"))
            ? 1000
            : 500;

    Rules.bExtractionRequired =
        GenreLower.Contains(TEXT("extraction")) ||
        WinLower.Contains(TEXT("extract"));

    Rules.bLossOnDeath = true;
    Rules.bArtifactRequired = WinLower.Contains(TEXT("artifact"));

    GameMode->ConfigureLoop(Rules);
    return true;
}

bool UGenesisMacroCommandSubsystem::ExecuteSetWorldState(
    const TSharedPtr<FJsonObject>& Payload)
{
    AGenesisMacroGameMode* GameMode =
        GetWorld() ? GetWorld()->GetAuthGameMode<AGenesisMacroGameMode>() : nullptr;

    if (!GameMode || !Payload.IsValid())
        return false;

    FString Faction;
    double TimeLimit = 0.0;

    if (!GetString(Payload, TEXT("faction_control"), Faction) ||
        !GetNumber(Payload, TEXT("time_limit_mins"), TimeLimit))
    {
        return false;
    }

    FGenesisMacroWorldState World;
    World.FactionControl = Faction;
    World.TimeLimitMinutes = FMath::Clamp(
        static_cast<float>(TimeLimit),
        1.0f,
        180.0f);
    World.TimeRemainingSeconds = World.TimeLimitMinutes * 60.0f;

    GetString(
        Payload,
        TEXT("current_location"),
        World.CurrentLocation);

    double Alert = 0.0;
    if (GetNumber(Payload, TEXT("alert_level"), Alert))
    {
        World.AlertLevel = FMath::Clamp(
            static_cast<float>(Alert),
            0.0f,
            1.0f);
    }

    GameMode->SetWorldState(World);
    return true;
}
