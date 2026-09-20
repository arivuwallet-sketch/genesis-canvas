#pragma once

#include "CoreMinimal.h"
#include "Containers/Queue.h"
#include "GameFramework/Actor.h"
#include "AICommandReceiver.generated.h"

class IWebSocketClientConnection;
class IWebSocketServer;

UCLASS()
class GENESISAI_API AAICommandReceiver : public AActor
{
    GENERATED_BODY()

public:
    AAICommandReceiver();

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
    virtual void Tick(float DeltaSeconds) override;

protected:
    UPROPERTY(EditAnywhere, Category = "AI|WebSocket")
    int32 WebSocketPort = 3002;

    UPROPERTY(EditAnywhere, Category = "AI|WebSocket")
    int32 MaxCommandsPerFrame = 4;

    UPROPERTY(EditAnywhere, Category = "AI|Environment")
    FName SunActorTag = TEXT("AI_Sun");

    UPROPERTY(EditAnywhere, Category = "AI|Environment")
    float SunIntensityAtNoon = 10.0f;

private:
    void HandleClientConnected(TSharedRef<IWebSocketClientConnection> Client);
    void HandleClientDisconnected(TSharedRef<IWebSocketClientConnection> Client);
    void HandleClientMessage(TSharedRef<IWebSocketClientConnection> Client, const FString& Message);

    void QueueCommandPayloads(const TArray<TSharedPtr<class FJsonValue>>& Commands);
    void ProcessQueuedCommands();

    bool ExecuteCommand(const TSharedPtr<class FJsonObject>& CommandObject);
    bool ExecuteSpawnActor(const TSharedPtr<class FJsonObject>& CommandObject);
    bool ExecuteDestroyActor(const TSharedPtr<class FJsonObject>& CommandObject);
    bool ExecuteTransformActor(const TSharedPtr<class FJsonObject>& CommandObject);
    bool ExecuteSetTimeOfDay(const TSharedPtr<class FJsonObject>& CommandObject);
    bool ExecuteApplyMaterial(const TSharedPtr<class FJsonObject>& CommandObject);
    bool ApplyMaterialToActor(
        AActor* Target,
        const TSharedPtr<class FJsonObject>& Parameters,
        FString& OutError);

    static bool ReadVector3(
        const TSharedPtr<class FJsonObject>& Parameters,
        const TCHAR* FieldName,
        FVector& OutValue);

    static bool ReadRotator(
        const TSharedPtr<class FJsonObject>& Parameters,
        const TCHAR* FieldName,
        FRotator& OutValue);

    AActor* ResolveTarget(const FString& TargetId) const;
    UClass* ResolveActorClass(const FString& AssetPath) const;

    void SendResponse(const FString& Type, const FString& Message, const FString& CommandName, const FString& TargetId = FString());

    TSharedPtr<IWebSocketServer> WebSocketServer;
    TSharedPtr<IWebSocketClientConnection> ActiveClient;

    TQueue<FString, EQueueMode::Mpsc> PendingCommandPayloads;
    TMap<FString, TWeakObjectPtr<AActor>> RuntimeActors;
};
