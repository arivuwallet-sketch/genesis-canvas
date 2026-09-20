#include "AICommandReceiver.h"

#include "Components/DirectionalLightComponent.h"
#include "Components/MeshComponent.h"
#include "IWebSocketClientConnection.h"
#include "IWebSocketServer.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "UObject/SoftObjectPath.h"
#include "WebSocketServerModule.h"

AAICommandReceiver::AAICommandReceiver()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.TickInterval = 0.0f;
}

void AAICommandReceiver::BeginPlay()
{
    Super::BeginPlay();

    if (!FWebSocketServerModule::IsAvailable())
    {
        UE_LOG(LogTemp, Error, TEXT("[GenesisAI] WebSocketServer module is unavailable."));
        return;
    }

    WebSocketServer = FWebSocketServerModule::Get().GetWebSocketServer(
        static_cast<uint32>(FMath::Clamp(WebSocketPort, 1, 65535)));

    if (!WebSocketServer.IsValid())
    {
        UE_LOG(LogTemp, Error, TEXT("[GenesisAI] Could not create WebSocket server."));
        return;
    }

    WebSocketServer->OnConnected(
        [this](TSharedRef<IWebSocketClientConnection> Client)
        {
            HandleClientConnected(Client);
        });

    WebSocketServer->OnDisconnected(
        [this](TSharedRef<IWebSocketClientConnection> Client)
        {
            HandleClientDisconnected(Client);
        });

    WebSocketServer->OnMessage(
        [this](TSharedRef<IWebSocketClientConnection> Client, const FString& Message)
        {
            HandleClientMessage(Client, Message);
        });

    if (!WebSocketServer->StartListening())
    {
        UE_LOG(
            LogTemp,
            Error,
            TEXT("[GenesisAI] Failed to listen on ws://localhost:%d."),
            WebSocketPort);
        return;
    }

    UE_LOG(
        LogTemp,
        Display,
        TEXT("[GenesisAI] AI command WebSocket listening on ws://localhost:%d."),
        WebSocketPort);

    if (ActiveClient.IsValid())
    {
        SendResponse(
            TEXT("hello"),
            TEXT("Genesis AI command receiver ready."),
            TEXT("hello"));
    }
}

void AAICommandReceiver::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (WebSocketServer.IsValid())
    {
        WebSocketServer->StopListening();
        WebSocketServer.Reset();
    }

    ActiveClient.Reset();

    FString DiscardedPayload;
    while (PendingCommandPayloads.Dequeue(DiscardedPayload))
    {
    }

    RuntimeActors.Empty();

    Super::EndPlay(EndPlayReason);
}

void AAICommandReceiver::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    ProcessQueuedCommands();
}

void AAICommandReceiver::HandleClientConnected(
    TSharedRef<IWebSocketClientConnection> Client)
{
    ActiveClient = Client;

    Client->SendText(
        TEXT("{"type":"hello","message":"Genesis AI command receiver ready."}"));
}

void AAICommandReceiver::HandleClientDisconnected(
    TSharedRef<IWebSocketClientConnection> Client)
{
    if (ActiveClient == Client)
    {
        ActiveClient.Reset();
    }
}

void AAICommandReceiver::HandleClientMessage(
    TSharedRef<IWebSocketClientConnection> Client,
    const FString& Message)
{
    ActiveClient = Client;

    TSharedPtr<FJsonObject> RootObject;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);

    if (!FJsonSerializer::Deserialize(Reader, RootObject) || !RootObject.IsValid())
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("Invalid JSON payload."),
            TEXT("parse"));
        return;
    }

    const TArray<TSharedPtr<FJsonValue>>* Commands = nullptr;
    if (!RootObject->TryGetArrayField(TEXT("commands"), Commands) || Commands == nullptr)
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("Payload must contain a commands array."),
            TEXT("parse"));
        return;
    }

    QueueCommandPayloads(*Commands);
}

void AAICommandReceiver::QueueCommandPayloads(
    const TArray<TSharedPtr<FJsonValue>>& Commands)
{
    for (const TSharedPtr<FJsonValue>& CommandValue : Commands)
    {
        const TSharedPtr<FJsonObject>* CommandObject = nullptr;
        if (!CommandValue.IsValid() ||
            CommandValue->TryGetObject(CommandObject) == nullptr ||
            CommandObject == nullptr ||
            !CommandObject->IsValid())
        {
            SendResponse(
                TEXT("ue_command_error"),
                TEXT("One command in the batch is not a JSON object."),
                TEXT("parse"));
            continue;
        }

        FString SerializedCommand;
        const TSharedRef<TJsonWriter<>> Writer =
            TJsonWriterFactory<>::Create(&SerializedCommand);

        if (!FJsonSerializer::Serialize(CommandObject->ToSharedRef(), Writer))
        {
            SendResponse(
                TEXT("ue_command_error"),
                TEXT("Could not serialize a queued command."),
                TEXT("parse"));
            continue;
        }

        PendingCommandPayloads.Enqueue(MoveTemp(SerializedCommand));
    }
}

void AAICommandReceiver::ProcessQueuedCommands()
{
    const int32 Budget = FMath::Max(1, MaxCommandsPerFrame);
    int32 Processed = 0;
    FString CommandPayload;

    while (Processed < Budget &&
           PendingCommandPayloads.Dequeue(CommandPayload))
    {
        ++Processed;

        TSharedPtr<FJsonObject> CommandObject;
        const TSharedRef<TJsonReader<>> Reader =
            TJsonReaderFactory<>::Create(CommandPayload);

        if (!FJsonSerializer::Deserialize(Reader, CommandObject) ||
            !CommandObject.IsValid())
        {
            SendResponse(
                TEXT("ue_command_error"),
                TEXT("Invalid queued command JSON."),
                TEXT("parse"));
            continue;
        }

        ExecuteCommand(CommandObject);
    }
}

bool AAICommandReceiver::ExecuteCommand(
    const TSharedPtr<FJsonObject>& CommandObject)
{
    FString CommandName;
    if (!CommandObject->TryGetStringField(TEXT("command"), CommandName))
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("Missing command field."),
            TEXT("parse"));
        return false;
    }

    if (CommandName == TEXT("SpawnActor"))
    {
        return ExecuteSpawnActor(CommandObject);
    }

    if (CommandName == TEXT("DestroyActor"))
    {
        return ExecuteDestroyActor(CommandObject);
    }

    if (CommandName == TEXT("TransformActor"))
    {
        return ExecuteTransformActor(CommandObject);
    }

    if (CommandName == TEXT("SetTimeOfDay"))
    {
        return ExecuteSetTimeOfDay(CommandObject);
    }

    if (CommandName == TEXT("ApplyMaterial"))
    {
        return ExecuteApplyMaterial(CommandObject);
    }

    SendResponse(
        TEXT("ue_command_error"),
        FString::Printf(TEXT("Unsupported command '%s'."), *CommandName),
        CommandName);
    return false;
}

bool AAICommandReceiver::ExecuteSpawnActor(
    const TSharedPtr<FJsonObject>& CommandObject)
{
    FString AssetPath;
    CommandObject->TryGetStringField(TEXT("asset_path"), AssetPath);

    if (AssetPath.IsEmpty())
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("SpawnActor requires asset_path."),
            TEXT("SpawnActor"));
        return false;
    }

    UClass* ActorClass = ResolveActorClass(AssetPath);
    if (!ActorClass || !ActorClass->IsChildOf(AActor::StaticClass()))
    {
        SendResponse(
            TEXT("ue_command_error"),
            FString::Printf(TEXT("Could not load actor class '%s'."), *AssetPath),
            TEXT("SpawnActor"));
        return false;
    }

    const TSharedPtr<FJsonObject>* ParametersPtr = nullptr;
    const TSharedPtr<FJsonObject> Parameters =
        CommandObject->TryGetObjectField(TEXT("parameters"));

    FVector Location = FVector::ZeroVector;
    FRotator Rotation = FRotator::ZeroRotator;
    FVector Scale = FVector::OneVector;

    if (Parameters.IsValid())
    {
        ReadVector3(Parameters, TEXT("location"), Location);
        ReadRotator(Parameters, TEXT("rotation"), Rotation);
        ReadVector3(Parameters, TEXT("scale"), Scale);
    }

    FActorSpawnParameters SpawnParameters;
    SpawnParameters.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

    AActor* SpawnedActor = GetWorld()->SpawnActor<AActor>(
        ActorClass,
        Location,
        Rotation,
        SpawnParameters);

    if (!SpawnedActor)
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("Unreal could not spawn the requested actor."),
            TEXT("SpawnActor"));
        return false;
    }

    SpawnedActor->SetActorScale3D(Scale);

    FString TargetId;
    CommandObject->TryGetStringField(TEXT("target_id"), TargetId);

    if (TargetId.IsEmpty())
    {
        TargetId = FString::Printf(TEXT("ue-%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits));
    }

    RuntimeActors.Add(TargetId, SpawnedActor);

    if (Parameters.IsValid())
    {
        ExecuteApplyMaterial(
            MakeShared<FJsonObject>(*CommandObject));
    }

    SendResponse(
        TEXT("ue_command_completed"),
        FString::Printf(
            TEXT("Spawned actor from '%s'."),
            *AssetPath),
        TEXT("SpawnActor"),
        TargetId);

    return true;
}

bool AAICommandReceiver::ExecuteDestroyActor(
    const TSharedPtr<FJsonObject>& CommandObject)
{
    FString TargetId;
    CommandObject->TryGetStringField(TEXT("target_id"), TargetId);

    AActor* Target = ResolveTarget(TargetId);
    if (!Target)
    {
        SendResponse(
            TEXT("ue_command_error"),
            FString::Printf(TEXT("Target '%s' was not found."), *TargetId),
            TEXT("DestroyActor"),
            TargetId);
        return false;
    }

    RuntimeActors.Remove(TargetId);
    Target->Destroy();

    SendResponse(
        TEXT("ue_command_completed"),
        FString::Printf(TEXT("Destroyed actor '%s'."), *TargetId),
        TEXT("DestroyActor"),
        TargetId);

    return true;
}

bool AAICommandReceiver::ExecuteTransformActor(
    const TSharedPtr<FJsonObject>& CommandObject)
{
    FString TargetId;
    CommandObject->TryGetStringField(TEXT("target_id"), TargetId);

    AActor* Target = ResolveTarget(TargetId);
    if (!Target)
    {
        SendResponse(
            TEXT("ue_command_error"),
            FString::Printf(TEXT("Target '%s' was not found."), *TargetId),
            TEXT("TransformActor"),
            TargetId);
        return false;
    }

    const TSharedPtr<FJsonObject> Parameters =
        CommandObject->TryGetObjectField(TEXT("parameters"));

    if (Parameters.IsValid())
    {
        FVector Location;
        if (ReadVector3(Parameters, TEXT("location"), Location))
        {
            Target->SetActorLocation(Location);
        }

        FRotator Rotation;
        if (ReadRotator(Parameters, TEXT("rotation"), Rotation))
        {
            Target->SetActorRotation(Rotation);
        }

        FVector Scale;
        if (ReadVector3(Parameters, TEXT("scale"), Scale))
        {
            Target->SetActorScale3D(Scale);
        }
    }

    SendResponse(
        TEXT("ue_command_completed"),
        FString::Printf(TEXT("Transformed actor '%s'."), *TargetId),
        TEXT("TransformActor"),
        TargetId);

    return true;
}

bool AAICommandReceiver::ExecuteSetTimeOfDay(
    const TSharedPtr<FJsonObject>& CommandObject)
{
    const TSharedPtr<FJsonObject> Parameters =
        CommandObject->TryGetObjectField(TEXT("parameters"));

    double TimeOfDay = 12.0;
    if (Parameters.IsValid())
    {
        Parameters->TryGetNumberField(TEXT("time_of_day"), TimeOfDay);
    }

    TimeOfDay = FMath::Clamp(TimeOfDay, 0.0, 24.0);

    TArray<AActor*> SunCandidates;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), SunActorTag, SunCandidates);

    if (SunCandidates.IsEmpty())
    {
        SendResponse(
            TEXT("ue_command_error"),
            FString::Printf(
                TEXT("No directional light actor with tag '%s' was found."),
                *SunActorTag.ToString()),
            TEXT("SetTimeOfDay"));
        return false;
    }

    AActor* SunActor = SunCandidates[0];
    UDirectionalLightComponent* SunLight =
        SunActor->FindComponentByClass<UDirectionalLightComponent>();

    if (!SunLight)
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("Configured sun actor has no DirectionalLightComponent."),
            TEXT("SetTimeOfDay"));
        return false;
    }

    const float NormalizedDay = static_cast<float>(TimeOfDay / 24.0);
    const float SunPitch = (NormalizedDay * 360.0f) - 90.0f;
    const float SunHeight =
        FMath::Sin((static_cast<float>(TimeOfDay) - 6.0f) / 12.0f * PI);
    const float DayLightFactor = FMath::Clamp(SunHeight, 0.0f, 1.0f);

    SunActor->SetActorRotation(FRotator(SunPitch, 0.0f, 0.0f));
    SunLight->SetIntensity(SunIntensityAtNoon * DayLightFactor);

    SendResponse(
        TEXT("ue_command_completed"),
        FString::Printf(
            TEXT("Set time of day to %.2f hours."),
            TimeOfDay),
        TEXT("SetTimeOfDay"));

    return true;
}

bool AAICommandReceiver::ExecuteApplyMaterial(
    const TSharedPtr<FJsonObject>& CommandObject)
{
    FString TargetId;
    CommandObject->TryGetStringField(TEXT("target_id"), TargetId);

    AActor* Target = ResolveTarget(TargetId);
    if (!Target)
    {
        return false;
    }

    const TSharedPtr<FJsonObject> Parameters =
        CommandObject->TryGetObjectField(TEXT("parameters"));

    if (!Parameters.IsValid())
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("ApplyMaterial requires parameters."),
            TEXT("ApplyMaterial"),
            TargetId);
        return false;
    }

    TArray<UMeshComponent*> MeshComponents;
    Target->GetComponents<UMeshComponent>(MeshComponents);

    if (MeshComponents.IsEmpty())
    {
        SendResponse(
            TEXT("ue_command_error"),
            FString::Printf(
                TEXT("Actor '%s' has no mesh component."),
                *TargetId),
            TEXT("ApplyMaterial"),
            TargetId);
        return false;
    }

    FString MaterialPath;
    Parameters->TryGetStringField(TEXT("material"), MaterialPath);

    UMaterialInterface* ParentMaterial = MeshComponents[0]->GetMaterial(0);

    if (!MaterialPath.IsEmpty())
    {
        UObject* LoadedMaterial = StaticLoadObject(
            UMaterialInterface::StaticClass(),
            nullptr,
            *MaterialPath);

        if (LoadedMaterial)
        {
            ParentMaterial = Cast<UMaterialInterface>(LoadedMaterial);
        }
    }

    UMaterialInstanceDynamic* DynamicMaterial =
        UMaterialInstanceDynamic::Create(ParentMaterial, this);

    if (!DynamicMaterial)
    {
        SendResponse(
            TEXT("ue_command_error"),
            TEXT("Failed to create a dynamic material instance."),
            TEXT("ApplyMaterial"),
            TargetId);
        return false;
    }

    FString ColorString;
    Parameters->TryGetStringField(TEXT("color"), ColorString);

    if (!ColorString.IsEmpty())
    {
        FLinearColor Color;
        if (FLinearColor::FromSRGBColor(FColor::FromHex(ColorString), Color))
        {
            DynamicMaterial->SetVectorParameterValue(
                TEXT("BaseColor"),
                Color);
        }
    }

    MeshComponents[0]->SetMaterial(0, DynamicMaterial);

    SendResponse(
        TEXT("ue_command_completed"),
        FString::Printf(TEXT("Applied material to '%s'."), *TargetId),
        TEXT("ApplyMaterial"),
        TargetId);

    return true;
}

bool AAICommandReceiver::ReadVector3(
    const TSharedPtr<FJsonObject>& Parameters,
    const TCHAR* FieldName,
    FVector& OutValue)
{
    const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;

    if (!Parameters.IsValid() ||
        !Parameters->TryGetArrayField(FieldName, Values) ||
        Values == nullptr ||
        Values->Num() != 3)
    {
        return false;
    }

    OutValue = FVector(
        static_cast<float>((*Values)[0]->AsNumber()),
        static_cast<float>((*Values)[1]->AsNumber()),
        static_cast<float>((*Values)[2]->AsNumber()));

    return true;
}

bool AAICommandReceiver::ReadRotator(
    const TSharedPtr<FJsonObject>& Parameters,
    const TCHAR* FieldName,
    FRotator& OutValue)
{
    FVector Euler;
    if (!ReadVector3(Parameters, FieldName, Euler))
    {
        return false;
    }

    OutValue = FRotator(Euler.X, Euler.Y, Euler.Z);
    return true;
}

AActor* AAICommandReceiver::ResolveTarget(const FString& TargetId) const
{
    if (TargetId.IsEmpty())
    {
        return nullptr;
    }

    if (const TWeakObjectPtr<AActor>* Found = RuntimeActors.Find(TargetId))
    {
        return Found->Get();
    }

    return nullptr;
}

UClass* AAICommandReceiver::ResolveActorClass(const FString& AssetPath) const
{
    FString ClassPath = AssetPath.TrimStartAndEnd();

    if (ClassPath.StartsWith(TEXT("Blueprint'")) && ClassPath.EndsWith(TEXT("'")))
    {
        ClassPath = ClassPath.Mid(10, ClassPath.Len() - 11);

        if (!ClassPath.EndsWith(TEXT("_C")))
        {
            ClassPath += TEXT("_C");
        }
    }

    if (ClassPath.StartsWith(TEXT("Class'")) && ClassPath.EndsWith(TEXT("'")))
    {
        ClassPath = ClassPath.Mid(6, ClassPath.Len() - 7);
    }

    FSoftClassPath SoftClassPath(ClassPath);
    return SoftClassPath.TryLoadClass<AActor>();
}

void AAICommandReceiver::SendResponse(
    const FString& Type,
    const FString& Message,
    const FString& CommandName,
    const FString& TargetId)
{
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetStringField(TEXT("type"), Type);
    Response->SetStringField(TEXT("message"), Message);
    Response->SetStringField(TEXT("command"), CommandName);

    if (!TargetId.IsEmpty())
    {
        Response->SetStringField(TEXT("target_id"), TargetId);
    }

    FString Payload;
    const TSharedRef<TJsonWriter<>> Writer =
        TJsonWriterFactory<>::Create(&Payload);
    FJsonSerializer::Serialize(Response.ToSharedRef(), Writer);

    if (ActiveClient.IsValid())
    {
        ActiveClient->SendText(Payload);
    }

    UE_LOG(LogTemp, Display, TEXT("[GenesisAI] %s"), *Payload);
}
