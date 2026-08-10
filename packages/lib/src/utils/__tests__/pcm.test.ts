import { describe, it, expect } from 'vitest';
import { base64ToUint8Array, decodePcm16Base64, float32ToPcm16, pcm16ToFloat32 } from '../pcm';

const toBase64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');

describe('pcm', () => {
  it('decodes base64 into bytes', () => {
    const bytes = base64ToUint8Array(toBase64([0, 1, 2, 255]));
    expect(Array.from(bytes)).toEqual([0, 1, 2, 255]);
  });

  it('converts 16-bit little-endian samples into normalized floats', () => {
    const samples = pcm16ToFloat32(new Uint8Array([0x00, 0x00, 0x00, 0x80, 0xff, 0x7f]));

    expect(samples.length).toBe(3);
    expect(samples[0]).toBe(0);
    expect(samples[1]).toBe(-1);
    expect(samples[2]).toBeCloseTo(1, 4);
  });

  it('ignores a trailing incomplete sample', () => {
    const samples = pcm16ToFloat32(new Uint8Array([0x00, 0x00, 0x01]));
    expect(samples.length).toBe(1);
  });

  it('decodes a base64 pcm chunk', () => {
    const samples = decodePcm16Base64(toBase64([0x00, 0x40]));
    expect(samples.length).toBe(1);
    expect(samples[0]).toBeCloseTo(0.5, 4);
  });

  it('returns an empty result for an empty chunk', () => {
    expect(decodePcm16Base64('').length).toBe(0);
  });
});

describe('float32ToPcm16', () => {
  it('encodes normalized floats as 16-bit little-endian samples', () => {
    const buffer = float32ToPcm16(new Float32Array([0, -1, 1]));
    const view = new DataView(buffer);

    expect(buffer.byteLength).toBe(6);
    expect(view.getInt16(0, true)).toBe(0);
    expect(view.getInt16(2, true)).toBe(-32768);
    expect(view.getInt16(4, true)).toBe(32767);
  });

  it('clips the samples outside the range', () => {
    const view = new DataView(float32ToPcm16(new Float32Array([2, -2])));

    expect(view.getInt16(0, true)).toBe(32767);
    expect(view.getInt16(2, true)).toBe(-32768);
  });

  it('survives a round trip', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0.25]);
    const restored = pcm16ToFloat32(new Uint8Array(float32ToPcm16(samples)));

    samples.forEach((sample, index) => expect(restored[index]).toBeCloseTo(sample, 4));
  });
});
