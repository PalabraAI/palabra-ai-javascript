import { ClientCredentialsAuth, UserTokenAuth } from '~/PalabraClient.model';
import { ApiResponse, SessionResponse, CreateSessionPayload } from './api.model';

export class PalabraApiClient {
  private baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(auth: ClientCredentialsAuth | UserTokenAuth, baseUrl?: string) {
    this.baseUrl = baseUrl;
    this.clientId = 'clientId' in auth ? auth.clientId : '';
    this.clientSecret = 'clientSecret' in auth ? auth.clientSecret : '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('ClientId and ClientSecret are required for API call! Pass them into constructor');
    }
  }

  private baseHeaders(): HeadersInit {
    return {
      'ClientId': this.clientId,
      'ClientSecret': this.clientSecret,
      'Content-Type': 'application/json',
    };
  }

  /**
     * createStreamingSession implements Step 2 of the Palabra Quick Start Guide: Creating a Streaming Session.
     * Documentation Reference: https://docs.palabra.ai/docs/quick-start#step-2-create-a-streaming-session
     */
  createStreamingSession = async (): Promise<ApiResponse<SessionResponse> | null> => {
    try {
      const payload: CreateSessionPayload = {
        data: {
          publisher_count: 1,
          subscriber_count: 0,
          publisher_can_subscribe: true,
        },
      };

      const response = await fetch(`${this.baseUrl}/session-storage/session`, {
        method: 'POST',
        headers: this.baseHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<SessionResponse> = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  deleteStreamingSession = async (sessionId: string): Promise<ApiResponse<void> | null> => {
    if (!sessionId) {
      throw new Error('SessionId is required for API call! Pass it into constructor');
    }

    try {
      await fetch(`${this.baseUrl}/session-storage/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.baseHeaders(),
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  };
}