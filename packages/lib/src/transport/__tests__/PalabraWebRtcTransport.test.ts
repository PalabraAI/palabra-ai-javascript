import { describe, it, expect, beforeEach } from 'vitest';
import { PalabraWebRtcTransport } from '../PalabraWebRtcTransport';
import type { PalabraWebRtcTransportConstructor } from '../PalabraWebRtcTransport.model';
import { vi } from 'vitest';
import { PipelineConfigManager } from '~/config/PipelineConfigManager';

class MockMediaStream {
  getAudioTracks() {
    return [new MockMediaStreamTrack()];
  }
}

class MockMediaStreamTrack {
  id = 'mock-track-id';
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
    const mockRoomConnect = vi.fn().mockResolvedValue(undefined);
    transport.getRoom().connect = mockRoomConnect;

    const setTaskSpy = vi.spyOn(transport, 'setTask').mockResolvedValue(undefined);
    // @ts-expect-error: mock publishInputAudio, which is not visible to the TS types
    const publishInputAudioSpy = vi.spyOn(transport, 'publishInputAudio').mockResolvedValue(undefined);

    await expect(transport.connect()).resolves.not.toThrow();

    expect(mockRoomConnect).toHaveBeenCalledWith('wss://test', 'token', { autoSubscribe: true });
    expect(setTaskSpy).toHaveBeenCalled();
    expect(publishInputAudioSpy).toHaveBeenCalled();
  });

  it('should call disconnect and its dependencies', async () => {
    const mockRoomDisconnect = vi.fn().mockResolvedValue(undefined);
    transport.getRoom().disconnect = mockRoomDisconnect;

    const mockEndTask = vi.spyOn(transport, 'endTask').mockResolvedValue(undefined);
    // @ts-expect-error: mock cleanupAudioResources, which is not visible to the TS types
    const mockCleanupAudioResources = vi.spyOn(transport, 'cleanupAudioResources').mockResolvedValue(undefined);

    await expect(transport.disconnect()).resolves.not.toThrow();

    expect(mockRoomDisconnect).toHaveBeenCalled();
    expect(mockEndTask).toHaveBeenCalled();
    expect(mockCleanupAudioResources).toHaveBeenCalled();

    expect(mockEndTask.mock.invocationCallOrder[0]).toBeLessThan(mockRoomDisconnect.mock.invocationCallOrder[0]);
    expect(mockRoomDisconnect.mock.invocationCallOrder[0]).toBeLessThan(mockCleanupAudioResources.mock.invocationCallOrder[0]);
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
});
