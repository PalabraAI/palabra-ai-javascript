import { SourceLangCode } from '~/utils/source';
import { TargetLangCode } from '~/utils/target';

export interface ClientCredentialsAuth {
  clientId: string;
  clientSecret: string;
}

export interface UserTokenAuth {
  userToken: string;
}

export interface PalabraClientData {
  auth:ClientCredentialsAuth | UserTokenAuth;
  translateFrom: SourceLangCode;
  translateTo: TargetLangCode;
  handleOriginalTrack: () => Promise<MediaStreamTrack>;
  transportType?: 'webrtc';
  apiBaseUrl?: string;
}

export interface PlayTranslationContext {
  streamSource: MediaStreamAudioSourceNode | null;
  gainNode: GainNode | null;
  audioElement: InstanceType<typeof Audio> | null;
  audioSources: MediaStreamAudioSourceNode[];
  gainNodes: GainNode[];
}