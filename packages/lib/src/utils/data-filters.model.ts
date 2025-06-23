export interface TranscriptionSegment {
  start: number;
  end: number;
  start_timestamp: number;
  end_timestamp: number;
  text: string;
}

export interface TranscriptionData {
  transcription: {
    language: string;
    segments: TranscriptionSegment[];
    text: string;
    transcription_id: string;
  };
}

export interface PipelineTimings {
  transcription_id: string;
  timings: {
    partial_transcription: number;
    validated_transcription: number;
    translated_transcription: number;
    prepared_tts_task: number;
    sent_tts_task: number;
    tts: number;
    sent_to_nats: number;
    total: number;
  };
}

export interface ErrorData {
  code: string;
  description: string;
  param: unknown
}