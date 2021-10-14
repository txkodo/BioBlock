declare module 'vorbis-encoder-js' {
  type encoder_tags = {
    TITLE: string,
    ALBUM: string, // UTF-8 is usable
    ARTIST: string,
    LOOPSTART: string,
    LOOPLENGTH: string
  }
  export class encoder{
    constructor(sampleRate:number, numChannels:number, quality:number, tags:encoder_tags);
    finish():Blob
    encodeFrom(audioBuffer:AudioBuffer):void
  }
}
