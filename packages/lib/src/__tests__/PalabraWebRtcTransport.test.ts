import { describe, it, expect, beforeEach } from 'vitest';
import { PalabraWebRtcTransport } from '../transport/PalabraWebRtcTransport';
import { EVENT_CONNECTION_STATE_CHANGED, EVENT_DATA_RECEIVED, EVENT_REMOTE_TRACKS_UPDATE, EVENT_ROOM_CONNECTED, EVENT_ROOM_DISCONNECTED, type PalabraWebRtcTransportConstructor } from '../transport/PalabraWebRtcTransport.model';
import { vi, type Mock } from 'vitest';
import { PipelineConfigManager } from '../config/PipelineConfigManager';
import { PalabraBaseEventEmitter } from '../PalabraBaseEventEmitter';
import { RemoteParticipant, RemoteTrack, RoomEvent, TrackPublication } from 'livekit-client';
import * as dataFilters from '../utils/data-filters';

class MockMediaStream {
  active = true;
  id = 'mock-stream-id';
  onaddtrack = null;
  onremovetrack = null;
  addTrack() { /* mock addTrack */ }
  removeTrack() { /* mock removeTrack */ }
  getTracks() { return this.getAudioTracks(); }
  getAudioTracks() { return [new MockMediaStreamTrack()]; }
  getVideoTracks() { return []; }
  dispatchEvent() { return true; }
  addEventListener() { /* mock addEventListener */ }
  removeEventListener() { /* mock removeEventListener */ }
  clone() { return this; }
  getTrackById(id: string) { return this.getAudioTracks().find(track => track.id === id) || null; }
}

// ReferenceError: MediaStream is not defined
(globalThis as unknown as { MediaStream: typeof MockMediaStream }).MediaStream = MockMediaStream;

// For storing RoomEvent handlers
const roomEventHandlers: Record<string, () => void> = {};

vi.mock('livekit-client', async () => {
  const actual = await vi.importActual<unknown>('livekit-client') as Record<string, unknown>;
  return {
    ...actual,
    Room: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      prepareConnection: vi.fn(),
      on: vi.fn((event, handler) => {
        roomEventHandlers[event] = handler;
      }),
      localParticipant: {
        publishTrack: vi.fn().mockResolvedValue(undefined),
        publishData: vi.fn().mockResolvedValue(undefined),
      },
      remoteParticipants: new Map(),
      state: 'disconnected',
    })),
    RoomEvent: actual.RoomEvent,
  };
});

class MockMediaStreamTrack implements MediaStreamTrack {
  id = 'mock-track-id';
  contentHint = '';
  enabled = true;
  kind = 'audio';
  label = 'mock-label';
  muted = false;
  onended: EventListener | null = null;
  onmute: EventListener | null = null;
  onunmute: EventListener | null = null;
  readyState: MediaStreamTrackState = 'live';
  getConstraints() { return {}; }
  stop() { /* mock stop */ }
  addEventListener() { /* mock addEventListener */ }
  removeEventListener() { /* mock removeEventListener */ }
  applyConstraints() { return Promise.resolve(); }
  clone() { return this; }
  getCapabilities() { return {}; }
  getSettings() { return {}; }
  dispatchEvent() { return true; }
}

describe('PalabraWebRtcTransport', () => {
  const data: PalabraWebRtcTransportConstructor = {
    streamUrl: 'wss://test',
    accessToken: 'token',
    inputStream: new MockMediaStream() as MediaStream,
    configManager: new PipelineConfigManager(),
  };
  let transport: PalabraWebRtcTransport;

  beforeEach(() => {
    transport = new PalabraWebRtcTransport(data);
  });

  it('should create a new PalabraWebRtcTransport', () => {
    expect(transport).toBeDefined();
    expect(transport.getRoom()).toBeDefined();
    expect(transport.getConnectionState()).toBeDefined();
    expect(transport.getParticipants()).toBeDefined();
    expect(transport.getParticipants()).toEqual([]);
    expect(transport.isConnected()).toBeDefined();
  });

  it('should call connect and its dependencies', async () => {
    const setTaskSpy = vi.spyOn(transport, 'setTask').mockResolvedValue(undefined);
    // @ts-expect-error: mock publishInputAudio, which is not visible to the TS types
    const publishInputAudioSpy = vi.spyOn(transport, 'publishInputAudio').mockResolvedValue(undefined);

    await expect(transport.connect()).resolves.not.toThrow();

    expect(transport.getRoom().connect).toHaveBeenCalledWith('wss://test', 'token', { autoSubscribe: true });
    expect(setTaskSpy).toHaveBeenCalled();
    expect(publishInputAudioSpy).toHaveBeenCalled();
  });

  it('should call disconnect and its dependencies', async () => {
    const mockEndTask = vi.spyOn(transport, 'endTask').mockResolvedValue(undefined);
    // @ts-expect-error: mock cleanupAudioResources, which is not visible to the TS types
    const mockCleanupAudioResources = vi.spyOn(transport, 'cleanupAudioResources').mockResolvedValue(undefined);

    await expect(transport.disconnect()).resolves.not.toThrow();

    expect(transport.getRoom().disconnect).toHaveBeenCalled();
    expect(mockEndTask).toHaveBeenCalled();
    expect(mockCleanupAudioResources).toHaveBeenCalled();

    expect(mockEndTask.mock.invocationCallOrder[0]).toBeLessThan((transport.getRoom().disconnect as Mock).mock.invocationCallOrder[0]);
    expect((transport.getRoom().disconnect as Mock).mock.invocationCallOrder[0]).toBeLessThan(mockCleanupAudioResources.mock.invocationCallOrder[0]);
  });

  it('should call setTask and its dependencies', async () => {
    const mockSendCommand = vi.spyOn(transport, 'sendCommand').mockResolvedValue(undefined);
    // @ts-expect-error: mock createHashForAllowedMessageTypes, which is not visible to the TS types
    const mockCreateHashForAllowedMessageTypes = vi.spyOn(transport, 'createHashForAllowedMessageTypes').mockResolvedValue(undefined);
    const config = new PipelineConfigManager().getConfig();
    await expect(transport.setTask(config)).resolves.not.toThrow();
    expect(mockSendCommand).toHaveBeenCalledWith('set_task', config);
    expect(mockCreateHashForAllowedMessageTypes).toHaveBeenCalled();
    expect(mockCreateHashForAllowedMessageTypes).toHaveBeenCalledWith(config.pipeline.allowed_message_types);
    expect(mockCreateHashForAllowedMessageTypes.mock.invocationCallOrder[0]).toBeLessThan(mockSendCommand.mock.invocationCallOrder[0]);
  });

  it('should call endTask and its dependencies', async () => {
    const mockSendCommand = vi.spyOn(transport, 'sendCommand').mockResolvedValue(undefined);
    await expect(transport.endTask()).resolves.not.toThrow();
    expect(mockSendCommand).toHaveBeenCalledWith('end_task', { 'force': false });
  });

  it('should call publishInputAudio and its dependencies', async () => {
    // @ts-expect-error: mock publishInputAudio, which is not visible to the TS types
    await expect(transport.publishInputAudio()).resolves.not.toThrow();
    expect(transport.getRoom().localParticipant.publishTrack).toHaveBeenCalled();
  });

  it('should publishInputAudio on connect', async () => {
    await expect(transport.connect()).resolves.not.toThrow();
    expect(transport.getRoom().localParticipant.publishTrack).toHaveBeenCalled();
  });

  it('transport should call emit EVENT_ROOM_CONNECTED when room emit RoomEvent.Connected', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    roomEventHandlers[RoomEvent.Connected]();
    expect(emitSpy).toHaveBeenCalledWith(EVENT_ROOM_CONNECTED);
  });
  it('transport should call emit EVENT_ROOM_DISCONNECTED when room emit RoomEvent.Disconnected', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    roomEventHandlers[RoomEvent.Disconnected]();
    expect(emitSpy).toHaveBeenCalledWith(EVENT_ROOM_DISCONNECTED);
  });
  it('transport should call emit EVENT_REMOTE_TRACKS_UPDATE when room emit RoomEvent.TrackSubscribed', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    const mockTrack = { sid: 'mock-sid', kind: 'audio', mediaStreamTrack: {} } as RemoteTrack;
    const mockPublication = { trackName: 'audio_en', trackSid: 'mock-sid' } as TrackPublication;
    const mockParticipant = { identity: 'user1' } as RemoteParticipant;
    // @ts-expect-error: mock RoomEvent.TrackSubscribed
    roomEventHandlers[RoomEvent.TrackSubscribed](mockTrack, mockPublication, mockParticipant);
    expect(emitSpy).toHaveBeenCalledWith(
      EVENT_REMOTE_TRACKS_UPDATE,
      [
        {
          track: {},
          language: 'en',
          participant: 'user1',
        },
      ],
    );
    expect(transport.remoteTracks.size).toBe(1);
  });
  it('transport should call emit EVENT_REMOTE_TRACKS_UPDATE when room emit RoomEvent.TrackUnsubscribed', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    const mockTrack = { sid: 'mock-sid', kind: 'audio', mediaStreamTrack: {} } as RemoteTrack;
    const mockPublication = { trackName: 'audio_en', trackSid: 'mock-sid' } as TrackPublication;
    const mockParticipant = { identity: 'user1' } as RemoteParticipant;
    // @ts-expect-error: mock RoomEvent.TrackSubscribed
    roomEventHandlers[RoomEvent.TrackUnsubscribed](mockTrack, mockPublication, mockParticipant);
    expect(emitSpy).toHaveBeenCalledWith(EVENT_REMOTE_TRACKS_UPDATE, []);
  });

  it('transport should call emit EVENT_REMOTE_TRACKS_UPDATE when room emit RoomEvent.ParticipantDisconnected', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    const mockTrack = { sid: 'mock-sid', kind: 'audio', mediaStreamTrack: {} } as RemoteTrack;
    const mockPublication = { trackName: 'audio_en', trackSid: 'mock-sid' } as TrackPublication;
    const mockParticipant = { identity: 'user1' } as RemoteParticipant;
    // @ts-expect-error: mock RoomEvent.TrackSubscribed
    roomEventHandlers[RoomEvent.ParticipantDisconnected](mockTrack, mockPublication, mockParticipant);
    expect(emitSpy).toHaveBeenCalledWith(EVENT_REMOTE_TRACKS_UPDATE, []);
  });

  it('transport should call emit EVENT_CONNECTION_STATE_CHANGED when room emit RoomEvent.ConnectionStateChanged', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    // @ts-expect-error: mock RoomEvent.ConnectionStateChanged
    roomEventHandlers[RoomEvent.ConnectionStateChanged]('connected');
    expect(emitSpy).toHaveBeenCalledWith(EVENT_CONNECTION_STATE_CHANGED, 'connected');
  });

  it('transport should emit EVENT_DATA_RECEIVED when room emit RoomEvent.DataReceived and handleReceivedData from dataFilters', async () => {
    const emitSpy = vi.spyOn(transport as unknown as PalabraBaseEventEmitter, 'emit');
    const handleReceivedDataSpy = vi.spyOn(dataFilters, 'handleReceivedData').mockImplementation(() => { /** mock */ });

    const payload = { message_type: 'translated_transcription' };
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const participant = 'participant';
    const topic = 'topic';

    // Allow the message type so the handler emits
    // @ts-expect-error: access private property for test
    transport.allowedMessageTypesHash.set('translated_transcription', 1);

    // @ts-expect-error: mock RoomEvent.DataReceived
    roomEventHandlers[RoomEvent.DataReceived](encoded, participant, topic);

    expect(emitSpy).toHaveBeenCalledWith(
      EVENT_DATA_RECEIVED,
      { payload, participant, topic },
    );
    expect(handleReceivedDataSpy).toHaveBeenCalledWith(transport, payload);
  });
});
