/**
 * Create a track from a file
 * @param audioBlob - file
 * @param audioContext - audio context AudioContext
 * @param options - options { loop: boolean, autoPlay: boolean }
 * @returns Promise<{track: MediaStreamTrack, audioElement: HTMLAudioElement}>
 */
export const createTrackFromFile = async (
  audioBlob: Blob,
  audioContext: AudioContext,
  options: { loop: boolean, autoPlay: boolean } = { loop: true, autoPlay: true },
): Promise<{track: MediaStreamTrack, audioElement: HTMLAudioElement}> => {

  const audioUrl = URL.createObjectURL(audioBlob);

  const audioElement = new Audio(audioUrl);
  audioElement.loop = options.loop;

  await new Promise((resolve, reject) => {
    audioElement.addEventListener('canplaythrough', resolve);
    audioElement.addEventListener('error', reject);
    audioElement.load();
  });

  const source = audioContext.createMediaElementSource(audioElement);
  const destination = audioContext.createMediaStreamDestination();

  source.connect(destination);

  if (options.autoPlay) {
    audioElement.play();
  }

  const audioTrack = destination.stream.getAudioTracks()[0];

  if (!audioTrack) {
    throw new Error('No audio track found');
  }

  URL.revokeObjectURL(audioUrl);

  return { track: audioTrack, audioElement };
};