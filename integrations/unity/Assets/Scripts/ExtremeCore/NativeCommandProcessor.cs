using System;
using Unity.Collections;
using Unity.Mathematics;

namespace Genesis.ExtremeCore
{
    /// <summary>
    /// Fixed-capacity binary command staging area. The WebSocket transport should
    /// hand an unmanaged byte span into Write() rather than allocating strings.
    /// The payload is consumed by an explicit protocol decoder on the main thread
    /// or a Burst-compatible job after framing/authentication has completed.
    /// </summary>
    public struct NativeCommandProcessor : IDisposable
    {
        private NativeArray<byte> _buffer;
        private NativeArray<byte> _scratch;

        public int Capacity => _buffer.IsCreated ? _buffer.Length : 0;

        public NativeCommandProcessor(int capacityBytes, Allocator allocator)
        {
            var capacity = math.max(1024, capacityBytes);
            _buffer = new NativeArray<byte>(capacity, allocator, NativeArrayOptions.UninitializedMemory);
            _scratch = new NativeArray<byte>(capacity, allocator, NativeArrayOptions.UninitializedMemory);
        }

        public bool Write(ReadOnlySpan<byte> payload)
        {
            if (!_buffer.IsCreated || payload.Length > _buffer.Length)
            {
                return false;
            }

            payload.CopyTo(_buffer.AsSpan());
            return true;
        }

        public NativeArray<byte> Data => _buffer;

        public void Clear()
        {
            if (_buffer.IsCreated)
            {
                _buffer.MemClear();
            }
        }

        public void Dispose()
        {
            if (_buffer.IsCreated)
            {
                _buffer.Dispose();
            }

            if (_scratch.IsCreated)
            {
                _scratch.Dispose();
            }
        }
    }
}
