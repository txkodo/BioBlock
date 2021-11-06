import { ModelInput, model_input } from "./model_input";
import { SoundInput, sound_input } from "./sound_input";
import { saveAs } from 'file-saver'
import { custom_model_data, item_id, TextInput } from "./text_input";
import { BioBlock, getModelItem } from "../bioblock/bioblock";
import { BBmodel } from "../model/types/bbmodel";

export class Download {
  model_input: ModelInput;
  sound_input: SoundInput;
  id_input:TextInput
  button: HTMLButtonElement;
  custom_model_data_input: TextInput;

  constructor(button: HTMLButtonElement, model_input: ModelInput, sound_input: SoundInput, id_input:TextInput,custom_model_data_input:TextInput) {
    this.button = button
    this.model_input = model_input
    this.sound_input = sound_input
    this.id_input = id_input
    this.custom_model_data_input = custom_model_data_input

    id_input.onchanged = this.changed
    custom_model_data_input.onchanged = this.changed
    sound_input.onchanged = this.changed
    model_input.onchanged = this.changed

    button.onclick = ( async () => {
      await this.download()
    })
  }

  async download() {
    if (!this.model_input.hasFile()) {
      throw new Error()
    }
    if (!this.sound_input.hasEnoughFiles()) {
      throw new Error()
    }

    const model_item = getModelItem(item_id.value,parseInt(custom_model_data.value))
    const pack = new BioBlock(model_input.bbmodels.map(json => new BBmodel(json)), model_item,sound_input.getSoundFiles() as {[key: string]: File})

    const [datapack, resourcepack] = pack.export()
    saveAs(await datapack.exportZip(), 'Datapack')
    saveAs(await resourcepack.exportZip(), 'Resourcepack')
  }
  
  changed = () => {
    const enable = this.id_input.valid && this.custom_model_data_input.valid && this.model_input.valid && this.sound_input.valid
    this.button.disabled = !enable
  }
}

const button = <HTMLButtonElement>document.getElementById('Download_button')
new Download(button, model_input, sound_input,item_id,custom_model_data)