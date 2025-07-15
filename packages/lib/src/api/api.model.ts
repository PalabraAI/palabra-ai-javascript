export interface ApiResponse<T> {
    data?: T;
    ok: boolean;
    errors?: {
      detail: string;
      error_code:number;
      instance:string;
      status:number;
      title:string;
      type:string;
    }[];
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

export interface SessionListResponse {
  sessions: {
    id:string,
    created_at:string,
    updated_at:string,
    expires_at:string
  }[] | null
}