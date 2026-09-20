using System;
using System.IO;
using System.IO.Compression;
using System.Text;
using UnityEngine;

namespace Genesis.HighLevel
{
    public static class GenesisMacroSaveSerializer
    {
        private const uint Magic = 0x47534D31; // GSM1
        private const byte Version = 1;

        [Serializable]
        public sealed class SaveEnvelope
        {
            public MacroWorldState world;
            public DirectorSnapshot director;
            public GenesisMacroGameManager.LoopStatus loopStatus;
            public int score;
            public bool playerAlive;
            public bool extracted;
            public bool artifactSecured;
            public MetaProgressionState meta;
            public string midLevelSnapshotJson;
            public string questsJson;
        }

        public static byte[] Serialize(SaveEnvelope snapshot)
        {
            byte[] json = Encoding.UTF8.GetBytes(JsonUtility.ToJson(snapshot));
            using var output = new MemoryStream();

            using (var writer = new BinaryWriter(output, Encoding.UTF8, true))
            {
                writer.Write(Magic);
                writer.Write(Version);
            }

            using (var gzip = new GZipStream(output, CompressionLevel.Fastest, true))
                gzip.Write(json, 0, json.Length);

            return output.ToArray();
        }

        public static SaveEnvelope Deserialize(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 5)
                throw new InvalidDataException("Macro save is truncated.");

            using var input = new MemoryStream(bytes);
            using var reader = new BinaryReader(input, Encoding.UTF8, true);

            if (reader.ReadUInt32() != Magic || reader.ReadByte() != Version)
                throw new InvalidDataException("Unsupported macro save header.");

            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            gzip.CopyTo(output);

            return JsonUtility.FromJson<SaveEnvelope>(
                Encoding.UTF8.GetString(output.ToArray()));
        }
    }
}
