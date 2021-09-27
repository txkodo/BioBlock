import { objectToZip, saveZip } from "./file"
import { Texture } from "./model/texture"
import { resourcepack } from "./resourcepack"

const setDropArea = (dropArea: HTMLInputElement, inputFile: HTMLInputElement, inputFile_name: HTMLElement, inputFile_log: HTMLElement) => {
  const onSelectedFile = (f: File) => {
    console.log(f.name)
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
      const a: any = {}
      a['test.test'] = 100
      console.log(a)

      const y: resourcepack = {
        'pack.mcmeta': 'test',
        assets: {}
      }

      new Texture({
        namespace: 'minecraft',
        folder: 'block/test',
        name: 'test.png',
        source: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABZUlEQVQ4T22TPUtDQRBF53XxI8bYSBA0YBMUFAURC3+CpUWwS2VqCwtbW2s7W3+MoCgoKVRiQIKNMSqY7slZvMu8uNssO2/3zMy987J2q5kPhh+2XF+y98HQWP23vq02GoVzbb5mc9WKPXVf4t3Pr2/LBNjaWLPr2webKU8HwO7OduHsAdXKbEgUATyYmiyHYApAhTxiZxUAJ0eH+X2nY2SACEAPdNZOolJpIgBop9t7tQwAfRH0FwXcXF+JrfgE0iwAEE9ZJZRKljb1xYUgoOIRcLC/l/uyVZr04EwC7cS9a5kA5xeX1m4140XKJausFZhk/lu0cTT6CdY9PveiRQLoAaIR0w48AFQW/XoA2eS3NFDvOILQEcBF9ZlyQzolAd4ByvIA35YmlCr1Jjs7Pc6vbu7idEksSmbAUiOttqgqADwxZReieauDMH+rMEj+jwSkER//F/y9fwBN2/hE6gfyQ4RWv0rZeo1JUwgpAAAAAElFTkSuQmCC",
        id: '0'
      }).exportJavaModel(y)
      console.log(y)
      await saveZip(objectToZip(y))
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
  console.log(inputFile.files == files)

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
