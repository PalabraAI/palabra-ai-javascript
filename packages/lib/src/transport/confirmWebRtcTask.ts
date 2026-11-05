import { RemoteParticipant, Room, RoomEvent } from 'livekit-client';
import { PipelineConfig } from '~/config/PipelineConfig.model';

const isTranslator = (participant?: RemoteParticipant) =>
  participant?.identity?.startsWith('palabra_translator_');

/** Confirm application of a complete task, rather than just delivery to LiveKit. */
export const confirmWebRtcTask = (room: Room, task: PipelineConfig, signal: AbortSignal, publishData: (message: Uint8Array, onSending: () => void) => Promise<void>): Promise<void> =>
  new Promise((resolve, reject) => {
    // Snapshot once: retries must not pick up mutations of the caller's settings.
    const message = new Uint8Array(new TextEncoder().encode(JSON.stringify({ message_type: 'set_task', data: task })));
    let settled = false;
    let hasSent = false;
    let hasPublished = false;
    let pendingAck = false;
    let sending = false;
    let retryDelay = 1250;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(retryTimer);
      clearTimeout(timeoutTimer);
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onAbort = () => finish(new DOMException('Task confirmation cancelled', 'AbortError'));
    const onDisconnected = () => finish(new Error('Room disconnected before task confirmation'));
    const onData = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (!hasSent || !isTranslator(participant) || topic) return;
      try {
        const response = JSON.parse(new TextDecoder().decode(payload));
        if (!response || typeof response !== 'object') return;
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (response.message_type === 'error') {
          finish(new Error(`set_task failed: ${JSON.stringify(data)}`));
        } else if (response.message_type === 'task_status' && data?.command === 'set_task' && data?.task_status === 'running') {
          if (sending) pendingAck = true;
          else if (hasPublished) finish();
        }
      } catch {
        // Other applications in the room may send non-JSON data.
      }
    };
    const publish = async () => {
      retryTimer = undefined;
      if (settled || sending) return;
      sending = true;
      if (Array.from(room.remoteParticipants.values()).some(isTranslator)) {
        try {
          await publishData(message, () => { hasSent = true; });
          hasPublished = true;
          if (pendingAck) finish();
        } catch {
          pendingAck = false;
          // Transient send failures are retried; the overall deadline still applies.
        }
      }
      sending = false;
      if (!settled) {
        retryTimer = setTimeout(publish, retryDelay);
        retryDelay = Math.min(retryDelay * 1.5, 5000);
      }
    };
    const onParticipantConnected = (participant: RemoteParticipant) => {
      if (isTranslator(participant) && !hasSent && !sending && retryTimer === undefined) void publish();
    };

    const timeoutTimer = setTimeout(() => finish(new Error('Task startup timed out before confirmation (30000 ms)')), 30000);
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    if (room.state !== 'connected') {
      onDisconnected();
      return;
    }
    const translator = Array.from(room.remoteParticipants.values()).find(isTranslator);
    if (translator) onParticipantConnected(translator);
  });
