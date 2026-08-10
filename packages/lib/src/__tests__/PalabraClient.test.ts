import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PalabraClient } from '../PalabraClient';
import type { TargetLangCode } from '../utils/target';
import type { SourceLangCode } from '../utils/source';
import { EVENT_START_TRANSLATION, EVENT_STOP_TRANSLATION } from '../transport/PalabraWebRtcTransport.model';
import { PalabraWebRtcTransport } from '../transport/PalabraWebRtcTransport';
import { PipelineConfigManager } from '~/config';

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
    createMediaStreamSource() {
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    createMediaStreamDestination() {
      return {
        stream: {
          getAudioTracks: () => [new MockMediaStreamTrack()],
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
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

const mockSwitchActiveDevice = vi.fn();

// Mock VolumeNode
vi.mock('../utils/VolumeNode', () => ({
  VolumeNode: vi.fn().mockImplementation(() => ({
    createChain: vi.fn().mockReturnValue(new MockMediaStreamTrack()),
    setVolume: vi.fn(),
    getVolume: vi.fn().mockReturnValue(1.0),
    mute: vi.fn(),
    unmute: vi.fn(),
    disconnect: vi.fn(),
    isActive: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('../transport/PalabraWebRtcTransport', () => ({
  PalabraWebRtcTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    setTask: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockImplementation(() => { /* mock */ }),
    getRoom: vi.fn().mockImplementation(() => ({
      switchActiveDevice: mockSwitchActiveDevice,
    })),
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

  describe('ConfigManager', () => {
    it('should set value and get value with extensions', ()=>{
      const manager = new PipelineConfigManager({ initialExtension: { testProp: 12 } });

      const cl = new PalabraClient({ ...baseConstructorData, configManager: manager });
      expect((cl.getConfigManager()).getValue('testProp')).toBe(12);

      (cl.getConfigManager()).setValue('testProp', 13);
      expect((cl.getConfigManager()).getValue('testProp')).toBe(13);

      manager.setValue('testProp', 14);
      expect((cl.getConfigManager()).getValue('testProp')).toBe(14);
    });

    it('should set value and get value without extensions', ()=>{
      const cl = new PalabraClient({ ...baseConstructorData });
      expect((cl.getConfigManager()).getValue('preprocessing.enable_vad')).toBe(true);
    });
  });

  describe('AudioContext', () => {
    it('should not close AudioContext in stopTranslation', async () => {
      const closeAudioContextSpy = vi.spyOn(client as unknown as { closeAudioContext: () => void }, 'closeAudioContext').mockImplementation(() => undefined);
      await client.stopTranslation();
      expect(closeAudioContextSpy).not.toHaveBeenCalled();
    });

    it('should not call close method on AudioContext in stopTranslation', async() => {
      const ctx = new AudioContext();
      const closeAudioContextSpy = vi.spyOn(ctx, 'close').mockImplementation(() => undefined);
      const localClient = new PalabraClient({ ...baseConstructorData, audioContext: ctx });
      await localClient.stopTranslation();
      expect(closeAudioContextSpy).not.toHaveBeenCalled();
    });

    it('should close AudioContext in cleanup', async () => {
      const closeAudioContextSpy = vi.spyOn(client as unknown as { closeAudioContext: () => void }, 'closeAudioContext').mockImplementation(() => undefined);
      await client.cleanup();
      expect(closeAudioContextSpy).toHaveBeenCalled();
    });

    it('should ignore AudioContext creation when ignoreAudioContext is true and audioContext is provided', async() => {
      const ctx = new AudioContext();
      const localClient = new PalabraClient({ ...baseConstructorData, audioContext: ctx, ignoreAudioContext: true });
      // @ts-expect-error: audioContext is private
      expect(localClient.audioContext).toBeUndefined();
    });

    it('should create a new AudioContext when ignoreAudioContext is false and audioContext is not provided', async() => {
      const localClient = new PalabraClient({ ...baseConstructorData, ignoreAudioContext: false });
      // @ts-expect-error: audioContext is private
      expect(localClient.audioContext).toBeDefined();
    });

    it('should use provided AudioContext', async() => {
      const ctx = new AudioContext();
      // @ts-expect-error field for test
      ctx.field = 'test';

      const localClient = new PalabraClient({ ...baseConstructorData, audioContext: ctx, ignoreAudioContext: false });
      // @ts-expect-error: audioContext is private
      expect(localClient.audioContext).toBeDefined();
      // @ts-expect-error: field for test
      expect(localClient.audioContext.field).toBe('test');
    });

    it('should create a new AudioContext when audioContext is not provided', async() => {
      const localClient = new PalabraClient(baseConstructorData);
      await localClient.startTranslation();
      // @ts-expect-error: audioContext is private
      expect(localClient.audioContext).toBeDefined();
    });
  });

  it('should get api client', () => {
    expect(client.getApiClient()).toBeDefined();
  });

  it('should get config manager', () => {
    expect(client.getConfigManager()).toBeDefined();
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
    await client.startPlayback();
    expect(playTracksSpy).toHaveBeenCalled();
    expect((client as unknown as { shouldPlayTranslation: boolean }).shouldPlayTranslation).toBe(true);
  });

  it('should stopPlayback and reset context', async () => {
    await client.stopPlayback();
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
    expect((client as unknown as { sessionData: unknown }).sessionData).toEqual({
      'id': 'session-id',
      'publisher': 'token',
      'webrtc_url': 'wss://test',
    });
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
    const initConfigSpy = vi.spyOn(client as unknown as { initConfig: () => void }, 'initConfig').mockImplementation(() => undefined);
    await client.cleanup();
    expect(stopTranslationSpy).toHaveBeenCalled();
    expect(initConfigSpy).toHaveBeenCalled();
  });

  it('should setVolume', async  () => {
    const setVolumeSpy = vi.spyOn(client as unknown as { setVolume: (...args: unknown[]) => void }, 'setVolume').mockImplementation(() => undefined);
    await client.startTranslation();
    client.setVolume('es', 0.5);
    expect(setVolumeSpy).toHaveBeenCalled();
  });

  it('should changeAudioOutputDevice', async () => {
    await client.startTranslation();
    await client.changeAudioOutputDevice('mock-device-id');
    expect((client as unknown as { deviceId: string }).deviceId).toBe('mock-device-id');
    expect(mockSwitchActiveDevice).toHaveBeenCalledWith('audiooutput', 'mock-device-id');
  });

  it('should call attach on remoteAudioTrack when playTracks is called', async () => {
    const mockAttach = vi.fn();
    const mockRemoteAudioTrack = { attach: mockAttach, attachedElements: [] };
    (client as unknown as { translationTracks: Map<string, unknown> })
      .translationTracks.set('test-sid', {
        remoteAudioTrack: mockRemoteAudioTrack,
        language: 'es',
      });
    await (client as unknown as { playTracks: () => void }).playTracks();
    expect(mockAttach).toHaveBeenCalled();
  });

  it('should call detach on remoteAudioTrack when stopPlayback is called', async () => {
    const mockDetach = vi.fn();
    const mockRemoteAudioTrack = { detach: mockDetach, attachedElements: [] };
    (client as unknown as { translationTracks: Map<string, unknown> })
      .translationTracks.set('test-sid', {
        remoteAudioTrack: mockRemoteAudioTrack,
        language: 'es',
      });
    await client.stopPlayback();
    expect(mockDetach).toHaveBeenCalled();
  });

  it('should not call attach on remoteAudioTrack when playTracks is called and remoteAudioTrack is already attached', async () => {
    const mockAttach = vi.fn();
    const mockRemoteAudioTrack = { attach: mockAttach, attachedElements: [1] };

    (client as unknown as { translationTracks: Map<string, unknown> })
      .translationTracks.set('test-sid', {
        remoteAudioTrack: mockRemoteAudioTrack,
        language: 'es',
      });

    await (client as unknown as { playTracks: () => void }).playTracks();
    expect(mockAttach).not.toHaveBeenCalled();
  });

  it('should call detach on remoteAudioTrack when stopPlayback is called', async () => {
    const mockDetach = vi.fn();
    const mockRemoteAudioTrack = { detach: mockDetach, attachedElements: [] };
    (client as unknown as { translationTracks: Map<string, unknown> })
      .translationTracks.set('test-sid', {
        remoteAudioTrack: mockRemoteAudioTrack,
        language: 'es',
      });
    await client.stopPlayback();
    expect(mockDetach).toHaveBeenCalled();
  });

  describe('createSession hook (queue / bring-your-own credentials)', () => {
    const noAuthData = { ...baseConstructorData, auth: undefined };

    it('throws when neither auth nor createSession is provided', () => {
      expect(() => new PalabraClient(noAuthData)).toThrow(/auth.*createSession/);
    });

    it('constructs without auth when createSession is provided (no api client)', () => {
      const createSession = vi.fn().mockResolvedValue({ streamUrl: 'wss://queue', accessToken: 'queue-token' });
      const cl = new PalabraClient({ ...noAuthData, createSession });
      expect(cl.getApiClient()).toBeUndefined();
    });

    it('uses the hook credentials and skips the session API on startTranslation', async () => {
      const createSession = vi.fn().mockResolvedValue({ streamUrl: 'wss://queue', accessToken: 'queue-token' });
      const cl = new PalabraClient({ ...noAuthData, createSession });

      vi.mocked(PalabraWebRtcTransport).mockClear();
      await cl.startTranslation();

      expect(createSession).toHaveBeenCalledOnce();
      expect(PalabraWebRtcTransport).toHaveBeenCalledWith(
        expect.objectContaining({ streamUrl: 'wss://queue', accessToken: 'queue-token' }),
      );

      expect((cl as unknown as { sessionData: unknown }).sessionData).toBeNull();
    });

    it('re-invokes the hook on each startTranslation (short-lived tokens)', async () => {
      const createSession = vi.fn().mockResolvedValue({ streamUrl: 'wss://queue', accessToken: 'queue-token' });
      const cl = new PalabraClient({ ...noAuthData, createSession });

      await cl.startTranslation();
      await cl.stopTranslation();
      await cl.startTranslation();

      expect(createSession).toHaveBeenCalledTimes(2);
    });

    it('does not call the session API to tear down a hook session', async () => {
      const createSession = vi.fn().mockResolvedValue({ streamUrl: 'wss://queue', accessToken: 'queue-token' });
      const cl = new PalabraClient({ ...noAuthData, createSession });

      await cl.startTranslation();
      await cl.stopTranslation();

      expect((cl as unknown as { transport: unknown }).transport).toBeNull();
    });
  });
});