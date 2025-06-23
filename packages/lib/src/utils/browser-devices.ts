export async function getLocalAudioTrack(): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      // @ts-expect-error needed property
      highpassFilter: true,
    },
  });

  const [track] = stream.getAudioTracks();
  if (!track) throw new Error('No audio track found from microphone');
  return track;
}

export async function getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audiooutput');
}
