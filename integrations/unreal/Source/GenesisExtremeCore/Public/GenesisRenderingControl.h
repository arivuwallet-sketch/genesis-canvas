#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GenesisRenderingControl.generated.h"

USTRUCT(BlueprintType)
struct GENESISEXTREMECORE_API FGenesisRenderingProfile
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bNaniteTessellation = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bLumenHardwareRayTracing = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 LumenReflectionBounces = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 VirtualShadowMapLocalRays = 8;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 VirtualShadowMapDirectionalRays = 8;
};

UCLASS(ClassGroup = (Genesis), meta = (BlueprintSpawnableComponent))
class GENESISEXTREMECORE_API UGenesisRenderingControl : public UActorComponent
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Genesis|Rendering")
    void ApplyProfile(const FGenesisRenderingProfile& Profile);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Rendering")
    void SetNaniteTessellation(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Rendering")
    void SetLumenHardwareRayTracing(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Rendering")
    void SetLumenReflectionBounces(int32 Bounces);

    UFUNCTION(BlueprintCallable, Category = "Genesis|Rendering")
    void SetVirtualShadowMapRayCounts(int32 LocalRays, int32 DirectionalRays);
};
