using System;
using System.Collections;
using NativeWebSocket;
using Unity.Collections;
using UnityEngine;

namespace Genesis.ExtremeCore
{
    /// <summary>
    /// Binary-only command ingress for Unity. NativeWebSocket supports WebGL and
    /// native Unity targets; this receiver avoids JSON parsing and stages the
    /// binary frame into a persistent NativeArray before dispatch.
    /// </summary>
    public sealed class NativeBinaryWebSocketReceiver : MonoBehaviour
    {
        [SerializeField] private string _url = "ws://127.0.0.1:3010";
        [SerializeField] private int _capacityBytes = 1024 * 1024;

        private WebSocket _socket;
        private NativeCommandProcessor _processor;
        private bool _initialized;

        private void Awake()
        {
            Application.runInBackground = true;
            _processor = new NativeCommandProcessor(
                _capacityBytes,
                Allocator.Persistent);
            _initialized = true;
        }

        private async void Start()
        {
            _socket = new WebSocket(_url);
            _socket.OnOpen += HandleOpen;
            _socket.OnError += HandleError;
            _socket.OnClose += HandleClose;
            _socket.OnMessage += HandleMessage;

            await _socket.Connect();
        }

        private void HandleOpen()
        {
            Debug.Log("[GenesisExtremeCore] Binary WebSocket connected.");
        }

        private void HandleError(string message)
        {
            Debug.LogError("[GenesisExtremeCore] WebSocket error: " + message);
        }

        private void HandleClose(WebSocketCloseCode code)
        {
            Debug.Log("[GenesisExtremeCore] WebSocket closed: " + code);
        }

        private void HandleMessage(byte[] bytes)
        {
            if (!_initialized || bytes == null || bytes.Length == 0)
            {
                return;
            }

            if (!_processor.Write(bytes))
            {
                Debug.LogWarning("[GenesisExtremeCore] Dropped oversized binary frame.");
                return;
            }

            // Copy-free parsing can operate over the persistent native buffer.
            // Dispatch only lightweight decoded metadata here; large ECS updates
            // are consumed by AIWorldCommandBridge on its normal ECS update group.
            var reader = new ProtobufWireReader(_processor.Data.AsReadOnlySpan());
            while (!reader.End && reader.TryReadTag(out int fieldNumber, out int wireType))
            {
                if (!reader.Skip(wireType))
                {
                    break;
                }
            }
        }

        private async void OnDestroy()
        {
            if (_socket != null)
            {
                await _socket.Close();
            }

            if (_initialized)
            {
                _processor.Dispose();
                _initialized = false;
            }
        }
    }
}
