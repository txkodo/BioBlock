import { BBmodelArea, model_input } from "./bb_droparea";
import { SoundInput, sound_input } from "./sound_input";
import { saveAs } from 'file-saver'

export class Download {
  model_input: BBmodelArea;
  sound_input: SoundInput;
  button: HTMLButtonElement;
  constructor(button: HTMLButtonElement, model_input: BBmodelArea, sound_input: SoundInput) {
    this.button = button
    this.model_input = model_input
    this.sound_input = sound_input

    button.onclick = ( async () => {
      await this.download()
    })
  }

  async download() {
    if (!this.model_input.pack) {
      throw new Error()
    }
    if (!this.sound_input.hasEnoughFiles()) {
      throw new Error()
    }
    this.model_input.pack.setSoundFiles(
      this.sound_input.getSoundFiles() as { [key: string]: File }
    )
     
    const [datapack, resourcepack] = this.model_input.pack.export()
    saveAs(await datapack.exportZip(), 'Datapack')
    saveAs(await resourcepack.exportZip(), 'Resourcepack')
  }
}

const button = <HTMLButtonElement>document.getElementById('Download_button')
new Download(button, model_input, sound_input)