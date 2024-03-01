// @ts-ignore
import {decodeBinary, encodeBinary} from 'base64-compressor'

export class ByteBuffer {
    private buffer: ArrayBuffer;
    private view: DataView;
    private wpos: number = 0;
    private rpos: number = 0;
    private endian: boolean; // true for LittleEndian, false for BigEndian

    constructor(data?: ArrayBuffer) {
        this.buffer = data || new ArrayBuffer(0);
        this.view = new DataView(this.buffer);
        this.endian = true; // Default to LittleEndian
    }

    public setEndian(littleEndian: boolean) {
        this.endian = littleEndian;
    }

    public writeBytes(bytes: Uint8Array) {
        this.ensureCapacity(this.wpos + bytes.length);

        for (let i = 0; i < bytes.length; i++) {
            this.view.setUint8(this.wpos + i, bytes[i]);
        }

        this.wpos += bytes.length;
    }

    public writeUint8(value: number) {
        this.ensureCapacity(this.wpos + 1);
        this.view.setUint8(this.wpos, value);
        this.wpos += 1;
    }

    public writeUint16(value: number) {
        this.ensureCapacity(this.wpos + 2);
        this.view.setUint16(this.wpos, value, this.endian);
        this.wpos += 2;
    }

    public writeUint32(value: number) {
        this.ensureCapacity(this.wpos + 4);
        this.view.setUint32(this.wpos, value, this.endian);
        this.wpos += 4;
    }

    public writeInt8(value: number) {
        this.ensureCapacity(this.wpos + 1);
        this.view.setInt8(this.wpos, value);
        this.wpos += 1;
    }

    public writeInt16(value: number) {
        this.ensureCapacity(this.wpos + 2);
        this.view.setInt16(this.wpos, value, this.endian);
        this.wpos += 2;
    }

    public writeInt32(value: number) {
        this.ensureCapacity(this.wpos + 4);
        this.view.setInt32(this.wpos, value, this.endian);
        this.wpos += 4;
    }

    public writeFloat32(value: number) {
        this.ensureCapacity(this.wpos + 4);
        this.view.setFloat32(this.wpos, value, this.endian);
        this.wpos += 4;
    }

    public writeFloat64(value: number) {
        this.ensureCapacity(this.wpos + 8);
        this.view.setFloat64(this.wpos, value, this.endian);
        this.wpos += 8;
    }

    public writeString(value: string) {
        const encoder = new TextEncoder();
        const encodedString = encoder.encode(value);
        this.writeUint8(encodedString.length);
        this.writeBytes(encodedString);
    }

    public writeText(value: string) {
        const encoder = new TextEncoder();
        const encodedString = encoder.encode(value);
        this.writeUint32(encodedString.length);
        this.writeBytes(encodedString);
    }

    public readUint8(): number {
        const value = this.view.getUint8(this.rpos);
        this.rpos += 1;
        return value;
    }

    public readUint16(): number {
        const value = this.view.getUint16(this.rpos, this.endian);
        this.rpos += 2;
        return value;
    }

    public readUint32(): number {
        const value = this.view.getUint32(this.rpos, this.endian);
        this.rpos += 4;
        return value;
    }

    public readInt8(): number {
        const value = this.view.getInt8(this.rpos);
        this.rpos += 1;
        return value;
    }

    public readInt16(): number {
        const value = this.view.getInt16(this.rpos, this.endian);
        this.rpos += 2;
        return value;
    }

    public readInt32(): number {
        const value = this.view.getInt32(this.rpos, this.endian);
        this.rpos += 4;
        return value;
    }

    public readFloat32(): number {
        const value = this.view.getFloat32(this.rpos, this.endian);
        this.rpos += 4;
        return value;
    }

    public readFloat64(): number {
        const value = this.view.getFloat64(this.rpos, this.endian);
        this.rpos += 8;
        return value;
    }

    public readString(): string {
        const length = this.readUint8();
        const decoder = new TextDecoder();
        const value = decoder.decode(new Uint8Array(this.buffer, this.rpos, length));
        this.rpos += length;
        return value;
    }

    public readText(): string {
        const length = this.readUint32();
        const decoder = new TextDecoder();
        const value = decoder.decode(new Uint8Array(this.buffer, this.rpos, length));
        this.rpos += length;
        return value;
    }

    // Helper method to ensure the buffer has enough capacity
    private ensureCapacity(requiredCapacity: number) {
        if (requiredCapacity <= this.buffer.byteLength) {
            return; // No need to resize, there's enough space
        }

        // Calculate new size: Either double the current size or make sure it's at least as large as requiredCapacity
        let newSize = Math.max(this.buffer.byteLength * 2, requiredCapacity);

        // Allocate new buffer and copy existing data
        let newBuffer = new ArrayBuffer(newSize);
        new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));

        // Update internal references
        this.buffer = newBuffer;
        this.view = new DataView(this.buffer);
    }

    public shrink() {
        // Calculate the size needed to fit the data, which is the maximum of the read and write positions
        const actualSize = Math.max(this.rpos, this.wpos);

        // If the actual size is less than the buffer's byte length, then we need to shrink the buffer
        if (actualSize < this.buffer.byteLength) {
            // Create a new ArrayBuffer that is just large enough to fit the data
            let newBuffer = new ArrayBuffer(actualSize);

            // Copy the data from the old buffer to the new buffer
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer, 0, actualSize));

            // Update the internal buffer and DataView to point to the new, smaller ArrayBuffer
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer);
        }
    }

    public async toBase64(): Promise<string> {
        this.shrink()
        return await encodeBinary(this.buffer)
    }

    public static async fromBase64(base64String: string): Promise<ByteBuffer> {
        const data = await decodeBinary(base64String)
        return new ByteBuffer(data)
    }

}
