#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "BehaviorTree/BTDecorator.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "GenesisAITasks.generated.h"

UCLASS()
class GENESISGAMEPLAY_API UBTTask_GenesisMoveToTarget : public UBTTaskNode
{
    GENERATED_BODY()

public:
    UBTTask_GenesisMoveToTarget();

    virtual EBTNodeResult::Type ExecuteTask(
        UBehaviorTreeComponent& OwnerComp,
        uint8* NodeMemory) override;

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetActorKey;

    UPROPERTY(EditAnywhere, Category = "Movement")
    float AcceptanceRadius = 100.0f;
};

UCLASS()
class GENESISGAMEPLAY_API UBTDecorator_GenesisHasTarget : public UBTDecorator
{
    GENERATED_BODY()

public:
    UBTDecorator_GenesisHasTarget();

    virtual bool CalculateRawConditionValue(
        UBehaviorTreeComponent& OwnerComp,
        uint8* NodeMemory) const override;

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetActorKey;
};
