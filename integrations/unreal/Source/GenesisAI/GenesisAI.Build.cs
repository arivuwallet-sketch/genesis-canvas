using UnrealBuildTool;

public class GenesisAI : ModuleRules
{
    public GenesisAI(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[]
            {
                "Core",
                "CoreUObject",
                "Engine",
                "WebSocketServer",
            }
        );

        PrivateDependencyModuleNames.AddRange(
            new string[]
            {
                "Json",
                "JsonUtilities",
            }
        );
    }
}
