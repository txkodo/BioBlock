import { Path } from "./util/folder"
import { saveAs } from 'file-saver';
import { BBmodel, bbmodel_json, jsonToBBmodel } from "./model/bbmodel";
import { CommandEntityPack } from "./command_entity/command_entity";

const setDropArea = (dropArea: HTMLInputElement, inputFile: HTMLInputElement, inputFile_name: HTMLElement, inputFile_log: HTMLElement) => {
  const onSelectedFile = (f: File) => {
    if (!f.name.endsWith('.bbmodel')) {
      // .bbmodelでなかった場合
      inputFile_log.textContent = "エラー：拡張子が.bbmodelである必要があります"
      inputFile.files = null
      inputFile_name.textContent = ""
      return
    }
    inputFile_name.textContent = f.name
    inputFile_log.textContent = ""

    const reader = new FileReader();

    reader.readAsText(f);

    reader.onload = async () => {
      const json = JSON.parse(reader.result as string);
      await test(json as bbmodel_json)
    }

  reader.onerror = function () {
    inputFile_log.textContent = ".bbmodelファイルの読み込み中にエラーが発生しました"
    inputFile.files = null
  };
}

dropArea.addEventListener('dragover', function (e) {
  e.preventDefault();
  dropArea.classList.add('active');
});

dropArea.addEventListener('dragleave', e => {
  e.preventDefault();
  dropArea.classList.remove('active');
});

dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('active');

  // ドロップしたファイルの取得
  const files = e.dataTransfer?.files as FileList;

  // 取得したファイルをinput[type=file]へ
  inputFile.files = files;

  if (typeof files[0] !== 'undefined') {
    //ファイルが正常に受け取れた際の処理
    onSelectedFile(files[0])
  } else {
    //ファイルが受け取れなかった際の処理
  }
});

inputFile.addEventListener('change', (e: Event) => {
  const files = (e.target as HTMLInputElement).files as FileList;
  if (typeof files[0] !== 'undefined') {
    //ファイルが正常に受け取れた際の処理
    onSelectedFile(files[0])
  } else {
    //ファイルが受け取れなかった際の処理
  }
  inputFile = inputFile;
})
}

const inputFile = <HTMLInputElement>document.getElementById('inputFile_input')
const inputFile_name = <HTMLInputElement>document.getElementById('inputFile_name')
const inputFile_log = <HTMLInputElement>document.getElementById('inputFile_log')
const dropArea = <HTMLInputElement>document.getElementById('dropArea')

setDropArea(dropArea, inputFile, inputFile_name, inputFile_log)

const test = async (bbmodel_json:bbmodel_json) => {
  const pack = new CommandEntityPack([jsonToBBmodel(bbmodel_json)],'minecraft:bone')
  const [datapack,resourcepack] = pack.export()
  saveAs(await datapack.exportZip(),'Datapack')
  saveAs(await resourcepack.exportZip(),'Resourcepack')
}