export const supportsAudioContextSetSinkId = () => {
  return 'setSinkId' in AudioContext.prototype;
};