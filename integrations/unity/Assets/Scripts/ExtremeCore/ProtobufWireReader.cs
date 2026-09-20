using System;
using Unity.Collections;

namespace Genesis.ExtremeCore
{
    public ref struct ProtobufWireReader
    {
        private ReadOnlySpan<byte> _data;
        private int _offset;

        public ProtobufWireReader(ReadOnlySpan<byte> data)
        {
            _data = data;
            _offset = 0;
        }

        public bool End => _offset >= _data.Length;

        public bool TryReadTag(out int fieldNumber, out int wireType)
        {
            fieldNumber = 0;
            wireType = 0;

            if (!TryReadVarint(out ulong tag))
            {
                return false;
            }

            fieldNumber = (int)(tag >> 3);
            wireType = (int)(tag & 0x07);
            return fieldNumber > 0;
        }

        public bool TryReadVarint(out ulong value)
        {
            value = 0;
            int shift = 0;

            while (_offset < _data.Length && shift < 64)
            {
                byte current = _data[_offset++];

                if (shift == 63 && (current & 0xFE) != 0)
                {
                    return false;
                }

                value |= (ulong)(current & 0x7F) << shift;

                if ((current & 0x80) == 0)
                {
                    return true;
                }

                shift += 7;
            }

            return false;
        }

        public bool TryReadFixed32(out uint value)
        {
            value = 0;

            if (_offset + 4 > _data.Length)
            {
                return false;
            }

            value =
                (uint)_data[_offset] |
                ((uint)_data[_offset + 1] << 8) |
                ((uint)_data[_offset + 2] << 16) |
                ((uint)_data[_offset + 3] << 24);

            _offset += 4;
            return true;
        }

        public bool TryReadLengthDelimited(out ReadOnlySpan<byte> value)
        {
            value = default;

            if (!TryReadVarint(out ulong length) || length > (ulong)(_data.Length - _offset))
            {
                return false;
            }

            value = _data.Slice(_offset, (int)length);
            _offset += (int)length;
            return true;
        }

        public bool Skip(int wireType)
        {
            switch (wireType)
            {
                case 0:
                    return TryReadVarint(out _);

                case 1:
                    if (_offset + 8 > _data.Length) return false;
                    _offset += 8;
                    return true;

                case 2:
                    return TryReadLengthDelimited(out _);

                case 5:
                    if (_offset + 4 > _data.Length) return false;
                    _offset += 4;
                    return true;

                default:
                    return false;
            }
        }

        public NativeArray<byte> CopyToNative(Allocator allocator)
        {
            var copy = new NativeArray<byte>(_data.Length, allocator, NativeArrayOptions.UninitializedMemory);
            _data.CopyTo(copy.AsSpan());
            return copy;
        }
    }
}
