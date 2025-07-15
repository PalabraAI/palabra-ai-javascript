export async function getLocalAudioTrack(deviceId?: string): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      // @ts-expect-error needed property
      highpassFilter: true,
      deviceId: deviceId || undefined,
    },
  });

  const [track] = stream.getAudioTracks();
  if (!track) throw new Error('No audio track found from microphone');
  return track;
}

export async function getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: 'default',
      },
    });
  } catch (err) {
    console.error(`Error enumerating devices: ${err.name}: ${err.message}`);
    return [];
  } finally {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audiooutput');
}
