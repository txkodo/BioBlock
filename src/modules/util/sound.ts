import { encoder } from "vorbis-encoder-js";

var context = new AudioContext();

export const mp3ToOgg = async (mp3:Blob) => {
  const arrayBuffer = await mp3.arrayBuffer()
  const audioBuffer = await context.decodeAudioData(arrayBuffer)
  
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const quality = 0; // -0.1 to 1 (Vorbis quality)
  const tags = {
    TITLE: "test_ogg",
    ALBUM: "テストアルバム", // UTF-8 is usable
    ARTIST: "miyabisun",
    LOOPSTART: "10000",
    LOOPLENGTH: "30000"
  };
  
  const encoder_ = new encoder(sampleRate, numberOfChannels, quality, tags);
  encoder_.encodeFrom(audioBuffer);
  const blob = encoder_.finish();
  return blob as Blob
}
