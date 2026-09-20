using UnrealBuildTool;

public class GenesisExtremeCore : ModuleRules
{
    public GenesisExtremeCore(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new[]
            {
                "Core",
                "CoreUObject",
                "Engine",
                "Json",
                "JsonUtilities",
                "MassEntity",
                "MassGameplay",
                "SmartObjects",
                "MassSmartObjects",
                "GeometryFramework",
                "GeometryScriptingCore",
            });

        PrivateDependencyModuleNames.AddRange(
            new[]
            {
                "MassAIBehavior",
                "RemoteControl",
                "WebRemoteControl",
                "WebSockets",
                "WebSocketServer",
                "PixelStreaming2",
                "PixelStreaming2Input",
            });
    }
}
