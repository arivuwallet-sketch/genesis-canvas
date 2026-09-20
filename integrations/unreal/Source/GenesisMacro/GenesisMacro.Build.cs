using UnrealBuildTool;

public class GenesisMacro : ModuleRules
{
    public GenesisMacro(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new[]
            {
                "Core",
                "CoreUObject",
                "Engine",
                "NetCore",
                "GameplayTags",
            });
    }
}
