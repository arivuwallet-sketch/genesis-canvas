#include "GenesisMacroGameState.h"

#include "Net/UnrealNetwork.h"

AGenesisMacroGameState::AGenesisMacroGameState()
{
    bReplicates = true;
}

void AGenesisMacroGameState::GetLifetimeReplicatedProps(
    TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(AGenesisMacroGameState, TimeRemainingSeconds);
    DOREPLIFETIME(AGenesisMacroGameState, Score);
    DOREPLIFETIME(AGenesisMacroGameState, bPlayerAlive);
    DOREPLIFETIME(AGenesisMacroGameState, bArtifactSecured);
    DOREPLIFETIME(AGenesisMacroGameState, bExtracted);
    DOREPLIFETIME(AGenesisMacroGameState, LoopStatus);
    DOREPLIFETIME(AGenesisMacroGameState, DirectorSnapshot);
}
