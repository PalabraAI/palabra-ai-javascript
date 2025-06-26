import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PalabraClient } from '../PalabraClient';
import type { TargetLangCode } from '../utils/target';
import type { SourceLangCode } from '../utils/source';
import { EVENT_START_TRANSLATION, EVENT_STOP_TRANSLATION } from '../transport/PalabraWebRtcTransport.model';

// Mock MediaStreamTrack for tests
class MockMediaStreamTrack {
  enabled = true;
  id = '';
  kind = 'audio';
  label = '';
  contentHint = '';
  muted = false;
  onended = null;
  onmute = null;
  onunmute = null;
  readyState = 'live';
  getConstraints() { return {}; }
  stop() { /* mock */ }
  addEventListener() { /* mock */ }
  removeEventListener() { /* mock */ }
  applyConstraints() { return Promise.resolve(); }
  clone() { return this; }
  getCapabilities() { return {}; }
  getSettings() { return {}; }
  dispatchEvent() { return true; }
}
if (typeof global.MediaStreamTrack === 'undefined') {
  // @ts-expect-error: Assigning mock class to global.MediaStreamTrack for test environment compatibility
  global.MediaStreamTrack = MockMediaStreamTrack;
}

class MockMediaStream {
  active = true;
  id = 'mock-stream-id';
  onaddtrack = null;
  onremovetrack = null;
  addTrack() { /* mock */ }
  removeTrack() { /* mock */ }
  getTracks() { return this.getAudioTracks(); }
  getAudioTracks() { return [new MockMediaStreamTrack()]; }
  getVideoTracks() { return []; }
  dispatchEvent() { return true; }
  addEventListener() { /* mock */ }
  removeEventListener() { /* mock*/ }
  clone() { return this; }
  getTrackById(id: string) { return this.getAudioTracks().find(track => track.id === id) || null; }
}

// ReferenceError: MediaStream is not defined
(globalThis as unknown as { MediaStream: typeof MockMediaStream }).MediaStream = MockMediaStream;

// Mock AudioContext
if (typeof global.AudioContext === 'undefined') {
  // @ts-expect-error: mock for test environment
  global.AudioContext = class {
    close() { return Promise.resolve(); }
  };
}

// Mock PalabraApiClient
vi.mock('../api/api', () => ({
  PalabraApiClient: vi.fn().mockImplementation(() => ({
    createStreamingSession: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'session-id',
        webrtc_url: 'wss://test',
        publisher: 'token',
      },
    }),
    deleteStreamingSession: vi.fn().mockResolvedValue({ ok: true }),
  })),
}));

vi.mock('../transport/PalabraWebRtcTransport', () => ({
  PalabraWebRtcTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    setTask: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockImplementation(() => { /* mock */ }),
  })),
}));

const baseConstructorData = {
  auth: {
    clientId: 'test',
    clientSecret: 'test',
  },
  translateFrom: 'en' as SourceLangCode,
  translateTo: 'es' as TargetLangCode,
  handleOriginalTrack: () => Promise.resolve(new MediaStreamTrack()),
};

describe('PalabraClient', () => {
  let client: PalabraClient;

  beforeEach(() => {
    client = new PalabraClient(baseConstructorData);
  });

  it('should create a new PalabraClient', () => {
    expect(client).toBeDefined();
  });

  it('should startTranslation and emit EVENT_START_TRANSLATION', async () => {
    const emitSpy = vi.spyOn(client as unknown as { emit: (...args: unknown[]) => void }, 'emit');
    const result = await client.startTranslation();
    expect(result).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(EVENT_START_TRANSLATION);
    expect((client as unknown as { transport: unknown }).transport).toBeDefined();
  });

  it('should stopTranslation and emit EVENT_STOP_TRANSLATION', async () => {
    const emitSpy = vi.spyOn(client as unknown as { emit: (...args: unknown[]) => void }, 'emit');
    await client.startTranslation();
    await client.stopTranslation();
    expect(emitSpy).toHaveBeenCalledWith(EVENT_STOP_TRANSLATION);
    expect((client as unknown as { transport: unknown }).transport).toBeNull();
  });

  it('should startPlayback and call playTracks', async () => {
    const playTracksSpy = vi.spyOn(client as unknown as { playTracks: () => void }, 'playTracks').mockImplementation(() => undefined);
    const initAudioContextSpy = vi.spyOn(client as unknown as { initAudioContext: () => void }, 'initAudioContext').mockImplementation(() => undefined);
    await client.startPlayback();
    expect(playTracksSpy).toHaveBeenCalled();
    expect(initAudioContextSpy).toHaveBeenCalled();
    expect((client as unknown as { shouldPlayTranslation: boolean }).shouldPlayTranslation).toBe(true);
  });

  it('should stopPlayback and reset context', async () => {
    const resetSpy = vi.spyOn(client as unknown as { resetPlayTranslationContext: () => void }, 'resetPlayTranslationContext').mockImplementation(() => undefined);
    await client.stopPlayback();
    expect(resetSpy).toHaveBeenCalled();
    expect((client as unknown as { shouldPlayTranslation: boolean }).shouldPlayTranslation).toBe(false);
  });

  it('should mute and unmute original track', async () => {
    await client.startTranslation();
    (client as unknown as { originalTrack: MockMediaStreamTrack }).originalTrack = new MockMediaStreamTrack();
    client.muteOriginalTrack();
    expect((client as unknown as { originalTrack: MockMediaStreamTrack }).originalTrack.enabled).toBe(false);
    client.unmuteOriginalTrack();
    expect((client as unknown as { originalTrack: MockMediaStreamTrack }).originalTrack.enabled).toBe(true);
  });

  it('should get config', () => {
    const config = client.getConfig();
    expect(config).toBeDefined();
    expect(config.pipeline).toBeDefined();
  });

  it('should delete session', async () => {
    await client.startTranslation();
    expect((client as unknown as { sessionData: unknown }).sessionData).not.toBeNull();
    await client.deleteSession();
    expect((client as unknown as { sessionData: unknown }).sessionData).toBeNull();
  });

  it('should setTranslateFrom and call setTask', async () => {
    await client.startTranslation();
    const setTaskSpy = vi.spyOn((client as unknown as { transport: { setTask: (...args: unknown[]) => Promise<void> } }).transport, 'setTask').mockResolvedValue(undefined);
    await client.setTranslateFrom('fr' as SourceLangCode);
    expect(setTaskSpy).toHaveBeenCalled();
  });

  it('should setTranslateTo and call setTask', async () => {
    await client.startTranslation();
    const setTaskSpy = vi.spyOn((client as unknown as { transport: { setTask: (...args: unknown[]) => Promise<void> } }).transport, 'setTask').mockResolvedValue(undefined);
    await client.setTranslateTo('fr' as TargetLangCode);
    expect(setTaskSpy).toHaveBeenCalled();
  });

  it('should addTranslationTarget and call setTask', async () => {
    await client.startTranslation();
    const setTaskSpy = vi.spyOn((client as unknown as { transport: { setTask: (...args: unknown[]) => Promise<void> } }).transport, 'setTask').mockResolvedValue(undefined);
    await client.addTranslationTarget('de' as TargetLangCode);
    expect(setTaskSpy).toHaveBeenCalled();
    expect(client.getConfig().pipeline.translations[1].target_language).toBe('de');
  });

  it('should removeTranslationTarget (single) and call setTask', async () => {
    await client.startTranslation();
    expect(client.getConfig().pipeline.translations.length).toBe(1);
    const setTaskSpy = vi.spyOn((client as unknown as { transport: { setTask: (...args: unknown[]) => Promise<void> } }).transport, 'setTask').mockResolvedValue(undefined);
    await client.removeTranslationTarget('es' as TargetLangCode);
    expect(setTaskSpy).toHaveBeenCalled();
    expect(client.getConfig().pipeline.translations.length).toBe(0);
  });

  it('should removeTranslationTarget (array) and call setTask', async () => {
    await client.startTranslation();
    expect(client.getConfig().pipeline.translations.length).toBe(1);
    await client.addTranslationTarget('de' as TargetLangCode);
    await client.addTranslationTarget('fr' as TargetLangCode);
    expect(client.getConfig().pipeline.translations.length).toBe(3);
    const setTaskSpy = vi.spyOn((client as unknown as { transport: { setTask: (...args: unknown[]) => Promise<void> } }).transport, 'setTask').mockResolvedValue(undefined);
    await client.removeTranslationTarget(['es', 'fr'] as TargetLangCode[]);
    expect(setTaskSpy).toHaveBeenCalled();
    expect(client.getConfig().pipeline.translations.length).toBe(1);
  });

  it('should cleanup call stopTranslation, stopPlayback, and initConfig', async () => {
    const stopTranslationSpy = vi.spyOn(client, 'stopTranslation').mockResolvedValue(undefined);
    const stopPlaybackSpy = vi.spyOn(client, 'stopPlayback').mockResolvedValue(undefined);
    const initConfigSpy = vi.spyOn(client as unknown as { initConfig: () => void }, 'initConfig').mockImplementation(() => undefined);
    await client.cleanup();
    expect(stopTranslationSpy).toHaveBeenCalled();
    expect(stopPlaybackSpy).toHaveBeenCalled();
    expect(initConfigSpy).toHaveBeenCalled();
  });
});