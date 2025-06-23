export interface StreamUpdateEvent {
  stream: MediaStream;
  metadata: {
    participantId: string;
    trackId: string;
    language: string;
    timestamp: number;
    trackCount: number;
  };
}

export interface RealtimeTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}