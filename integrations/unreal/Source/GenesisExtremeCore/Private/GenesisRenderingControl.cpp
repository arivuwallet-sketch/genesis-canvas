#include "GenesisRenderingControl.h"

#include "HAL/IConsoleManager.h"

namespace
{
    void SetCVar(const TCHAR* Name, int32 Value)
    {
        if (IConsoleVariable* Variable =
                IConsoleManager::Get().FindConsoleVariable(Name))
        {
            Variable->Set(Value, ECVF_SetByCode);
        }
    }
}

void UGenesisRenderingControl::ApplyProfile(
    const FGenesisRenderingProfile& Profile)
{
    SetNaniteTessellation(Profile.bNaniteTessellation);
    SetLumenHardwareRayTracing(Profile.bLumenHardwareRayTracing);
    SetLumenReflectionBounces(Profile.LumenReflectionBounces);
    SetVirtualShadowMapRayCounts(
        Profile.VirtualShadowMapLocalRays,
        Profile.VirtualShadowMapDirectionalRays);
}

void UGenesisRenderingControl::SetNaniteTessellation(bool bEnabled)
{
    SetCVar(TEXT("r.Nanite.Tessellation"), bEnabled ? 1 : 0);
}

void UGenesisRenderingControl::SetLumenHardwareRayTracing(bool bEnabled)
{
    SetCVar(TEXT("r.Lumen.HardwareRayTracing"), bEnabled ? 1 : 0);
    SetCVar(TEXT("r.Lumen.Reflections.HardwareRayTracing"), bEnabled ? 1 : 0);
}

void UGenesisRenderingControl::SetLumenReflectionBounces(int32 Bounces)
{
    SetCVar(TEXT("r.Lumen.Reflections.MaxBounces"), FMath::Clamp(Bounces, 0, 8));
}

void UGenesisRenderingControl::SetVirtualShadowMapRayCounts(
    int32 LocalRays,
    int32 DirectionalRays)
{
    SetCVar(
        TEXT("r.Shadow.Virtual.SMRT.RayCountLocal"),
        FMath::Clamp(LocalRays, 1, 32));

    SetCVar(
        TEXT("r.Shadow.Virtual.SMRT.RayCountDirectional"),
        FMath::Clamp(DirectionalRays, 1, 32));
}
