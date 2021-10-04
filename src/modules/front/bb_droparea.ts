import { CEPack } from "../command_entity/command_entity"
import { bbmodel_json, jsonToBBmodel } from "../model/bbmodel"
import { DropArea } from "../style/filedrop"
import { FileReaderSync } from "../util/filrreader_sync"

const onSelected = async (files: FileList, dropArea: DropArea) => {
  // ファイルが選択されなかった場合
  if (files[0] === undefined) {
    dropArea.removeFiles()
    dropArea.setLog("ファイルが選択されていません")
    return
  }
  
  const file = files[0]
  
  // ファイルが.bbmodelでなかった場合
  if (!file.name.endsWith('.bbmodel')) {
    dropArea.removeFiles()
    dropArea.setLog("エラー：拡張子が.bbmodelである必要があります")
    return
  }

  const reader = new FileReaderSync();

  const filecontents = []
  
  for (let i = 0;i<files.length;i++){
    const filecontent = await reader.readAsText(files[i])
    
    if (! filecontent){
      dropArea.removeFiles()
      dropArea.setLog(".bbmodelファイルの読み込み中にエラーが発生しました")
      return
    }
    filecontents.push(filecontent)
  }

  const bbmodels = filecontents.map(filecontent => JSON.parse(filecontent as string));

  await read_bbmodels(bbmodels)
}

const fileInput = <HTMLInputElement>document.getElementById('BBinputFile_input')
const fileInput_name = <HTMLInputElement>document.getElementById('BBinputFile_name')
const fileInput_log = <HTMLInputElement>document.getElementById('BBinputFile_log')
const dropArea = <HTMLInputElement>document.getElementById('BBdropArea')

new DropArea({
  dropArea,
  fileInput,
  fileInput_name,
  fileInput_log,
  onSelected
})

const read_bbmodels = async (bbmodel_jsons: bbmodel_json[]) => {
  const pack = new CEPack(bbmodel_jsons.map(jsonToBBmodel), 'minecraft:bone')
  const [datapack, resourcepack] = pack.export()
  saveAs(await datapack.exportZip(), 'Datapack')
  saveAs(await resourcepack.exportZip(), 'Resourcepack')
}
