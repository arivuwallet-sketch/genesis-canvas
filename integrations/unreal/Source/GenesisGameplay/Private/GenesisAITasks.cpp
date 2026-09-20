#include "GenesisAITasks.h"

#include "AIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "GameFramework/Pawn.h"

UBTTask_GenesisMoveToTarget::UBTTask_GenesisMoveToTarget()
{
    NodeName = TEXT("Genesis: Move To Target");
}

EBTNodeResult::Type UBTTask_GenesisMoveToTarget::ExecuteTask(
    UBehaviorTreeComponent& OwnerComp,
    uint8* NodeMemory)
{
    AAIController* Controller = OwnerComp.GetAIOwner();
    if (!Controller || !TargetActorKey.SelectedKeyName.IsValid())
    {
        return EBTNodeResult::Failed;
    }

    UBlackboardComponent* Blackboard = OwnerComp.GetBlackboardComponent();
    if (!Blackboard)
    {
        return EBTNodeResult::Failed;
    }

    AActor* Target = Cast<AActor>(
        Blackboard->GetValueAsObject(TargetActorKey.SelectedKeyName));

    if (!Target)
    {
        return EBTNodeResult::Failed;
    }

    const EPathFollowingRequestResult::Type Result =
        Controller->MoveToActor(
            Target,
            AcceptanceRadius,
            true,
            true,
            true,
            nullptr,
            true);

    return Result == EPathFollowingRequestResult::AlreadyAtGoal
        ? EBTNodeResult::Succeeded
        : Result == EPathFollowingRequestResult::RequestSuccessful
            ? EBTNodeResult::InProgress
            : EBTNodeResult::Failed;
}

UBTDecorator_GenesisHasTarget::UBTDecorator_GenesisHasTarget()
{
    NodeName = TEXT("Genesis: Has Target");
}

bool UBTDecorator_GenesisHasTarget::CalculateRawConditionValue(
    UBehaviorTreeComponent& OwnerComp,
    uint8* NodeMemory) const
{
    const UBlackboardComponent* Blackboard =
        OwnerComp.GetBlackboardComponent();

    if (!Blackboard || !TargetActorKey.SelectedKeyName.IsValid())
    {
        return false;
    }

    return Blackboard->GetValueAsObject(
        TargetActorKey.SelectedKeyName) != nullptr;
}
