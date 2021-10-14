import { BioBlock, getModelItem } from "../bioblock/bioblock"
import { BBmodel } from "../model/types/bbmodel"
import { bbmodel_json } from "../model/types/bbmodel_json"
import { DropArea } from "../style/filedrop"
import { FileReaderSync } from "../util/filrreader_sync"
import { SoundInput, sound_input } from "./sound_input"

export class BBmodelArea extends DropArea {
  pack: BioBlock | undefined
  sound_input: SoundInput
  onchanged:((ready:boolean)=>void)|undefined;

  constructor(option: {
    dropArea: HTMLInputElement;
    fileInput: HTMLInputElement;
    fileInput_name: HTMLElement;
    fileInput_log: HTMLElement;
  },sound_input: SoundInput) {
    super(option)
    this.sound_input = sound_input
  }

  async setFiles(files: FileList) {
    // ファイルが選択されなかった場合
    if (files[0] === undefined) {
      this.removeFiles()
      this.setLog("ファイルが選択されていません")
      return
    }

    const reader = new FileReaderSync();
    
    const filecontents = []
    const filenames    = []
    
    for (let i = 0; i < files.length; i++) {

      // ファイルが.bbmodelでなかった場合
      if (!files[i].name.endsWith('.bbmodel')) {
        this.removeFiles()
        this.setLog("エラー：拡張子が.bbmodelである必要があります")
        return
      }
      
      // ファイルが読み込めなかった場合
      const filecontent = await reader.readAsText(files[i])
      if (!filecontent) {
        this.removeFiles()
        this.setLog(".bbmodelファイルの読み込み中にエラーが発生しました")
        return
      }
      filenames.push(files[i].name)
      filecontents.push(filecontent)
    }
    const bbmodels = filecontents.map(filecontent => JSON.parse(filecontent as string) as bbmodel_json);
    this.pack = new BioBlock(bbmodels.map(json => new BBmodel(json)), getModelItem('minecraft:bone'))
    this.sound_input.setRequiresdFiles(this.pack.getSoundList())
    if(this.onchanged){
      this.onchanged(this.sound_input.hasEnoughFiles())
    }
    fileInput_name.textContent = filenames.join(' ')
    return
  }
}

const fileInput = <HTMLInputElement>document.getElementById('BBinputFile_input')
const fileInput_name = <HTMLInputElement>document.getElementById('BBinputFile_name')
const fileInput_log = <HTMLInputElement>document.getElementById('BBinputFile_log')
const dropArea = <HTMLInputElement>document.getElementById('BBdropArea')

export const model_input = new BBmodelArea({
  dropArea,
  fileInput,
  fileInput_name,
  fileInput_log
},sound_input)

