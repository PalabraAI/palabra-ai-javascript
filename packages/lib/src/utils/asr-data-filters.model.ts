export type AsrServerMessageType = 'transcription' | 'translated_transcription';

export interface AsrTranscriptionSegment {
  text: string;
  start_time: number;
  end_time: number;
}

export interface AsrTranscriptionData {
  message_type: AsrServerMessageType;
  transcription_id: string;
  language: string;
  is_eos: boolean;
  segment: AsrTranscriptionSegment;
  delta?: AsrTranscriptionSegment;
}

export interface AsrServerMessage {
  message_type: AsrServerMessageType;
  [key: string]: unknown;
}
