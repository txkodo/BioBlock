import { BioBlock, extractSoundFileNames, getModelItem } from "../bioblock/bioblock"
import { BBmodel } from "../model/types/bbmodel"
import { bbmodel_json } from "../model/types/bbmodel_json"
import { DropArea } from "../style/filedrop"
import { FileReaderSync } from "../util/filrreader_sync"
import { SoundInput, sound_input } from "./sound_input"

export class ModelInput extends DropArea {
  pack: BioBlock | undefined
  sound_input: SoundInput
  valid:boolean
  onchanged:(()=>void)|undefined;
  bbmodels: bbmodel_json[] = []

  constructor(option: {
    dropArea: HTMLInputElement;
    fileInput: HTMLInputElement;
    fileInput_name: HTMLElement;
    fileInput_log: HTMLElement;
  },sound_input: SoundInput) {
    super(option)
    this.valid = false
    this.sound_input = sound_input
  }
  
  hasFile() {
    return this.bbmodels.length !== 0
  }

  async setFiles(files: FileList) {
    this.valid = false
    if(this.onchanged){
      this.onchanged()
    }

    // ファイルが選択されなかった場合
    if (files[0] === undefined) {
      this.error("ファイルが選択されていません")
      return
    }

    const reader = new FileReaderSync();
    
    const filecontents = []
    const filenames    = []
    
    for (let i = 0; i < files.length; i++) {

      // ファイルが.bbmodelでなかった場合
      if (!files[i].name.endsWith('.bbmodel')) {
        this.error("エラー：拡張子が.bbmodelである必要があります")
        return
      }

      // ファイルが読み込めなかった場合
      const filecontent = await reader.readAsText(files[i])
      if (!filecontent) {
        this.error(".bbmodelファイルの読み込み中にエラーが発生しました")
        return
      }

      filenames.push(files[i].name)
      filecontents.push(filecontent)
    }

    this.bbmodels = filecontents.map(filecontent => JSON.parse(filecontent as string) as bbmodel_json)
    const soundNames = extractSoundFileNames(this.bbmodels)
    this.sound_input.setRequiresdFiles(soundNames)
    console.log(soundNames);
    fileInput_name.textContent = filenames.join(' ')
    this.valid = true
    if(this.onchanged){
      this.onchanged()
    }
    return
  }
}

const fileInput = <HTMLInputElement>document.getElementById('BBinputFile_input')
const fileInput_name = <HTMLInputElement>document.getElementById('BBinputFile_name')
const fileInput_log = <HTMLInputElement>document.getElementById('BBinputFile_log')
const dropArea = <HTMLInputElement>document.getElementById('BBdropArea')

export const model_input = new ModelInput({
  dropArea,
  fileInput,
  fileInput_name,
  fileInput_log
},sound_input)

