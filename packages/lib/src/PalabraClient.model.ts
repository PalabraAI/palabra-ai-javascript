import { SourceLangCode } from '~/utils/source';
import { TargetLangCode } from '~/utils/target';
import { PipelineConfigManager } from './config/PipelineConfigManager';

export interface ClientCredentialsAuth {
  clientId: string;
  clientSecret: string;
}

export interface UserTokenAuth {
  userToken: string;
}

export interface SessionCredentials {
  streamUrl: string;
  accessToken: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PalabraClientData<CM extends PipelineConfigManager<any> = PipelineConfigManager<any>> {
  auth?: ClientCredentialsAuth | UserTokenAuth;
  createSession?: () => Promise<SessionCredentials>;
  translateFrom: SourceLangCode;
  translateTo: TargetLangCode;
  handleOriginalTrack: () => Promise<MediaStreamTrack>;
  transportType?: 'webrtc';
  apiBaseUrl?: string;
  intent?:string;
  audioContext?:AudioContext;
  ignoreAudioContext?:boolean;
  configManager?: CM;
}

export type TrackSid = string;