export interface ApiResponse<T> {
    data?: T;
    ok: boolean;
  }

export interface SessionResponse {
  id:string;
  publisher: string;
  subscriber: string[];
  webrtc_room_name: string;
  webrtc_url: string;
  ws_url: string;
}

export interface CreateSessionPayload {
    data: {
      publisher_count: number,
      subscriber_count: number,
      publisher_can_subscribe: boolean,
    }
  }