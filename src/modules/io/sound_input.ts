import { DropArea } from "../style/filedrop";
import { mp3ToOgg } from "../util/sound";

export class SoundInput extends DropArea {
  private sounds: { [key: string]: null | Blob } = {}
  fileInput_needed: HTMLUListElement;
  onchanged:((ready:boolean)=>void)|undefined;

  constructor(option: {
    dropArea: HTMLInputElement,
    fileInput: HTMLInputElement,
    fileInput_name: HTMLElement,
    fileInput_log: HTMLElement,
    fileInput_needed: HTMLUListElement,
  }) {
    super(option)
    this.fileInput_needed = fileInput_needed
  }

  updateNeeded() {
    this.fileInput_needed.innerHTML = ''
    let ready = true
    Object.keys(this.sounds).forEach(sound_name => {
      const li = document.createElement('li')
      this.fileInput_needed.appendChild(li)
      li.textContent = sound_name
      ready ??= this.sounds[sound_name]?true:false
      li.classList.add(this.sounds[sound_name]?'li-exist':'li-lack')
    });
    if (this.onchanged){
      console.log(ready);
      
      this.onchanged(ready)
    }
  }

  async setFiles(files: FileList) {
    this.clearLog()

    // ファイルが選択されなかった場合
    if (files[0] === undefined) {
      this.removeFiles()
      this.setLog("ファイルが選択されていません")
      return
    }

    const filenames: string[] = []

    for (let i = 0; i < files.length; i++) {
      // 関係のないファイルだった場合
      if (this.sounds[files[i].name] === undefined) {
        this.removeFiles()
        this.setLog(`エラー：${files[i].name}は選択されたbbmodelにおいて使われていません。`)
        continue
      }

      // ファイルが.bbmodelでなかった場合
      const match = files[i].name.match('.*\.(ogg|mp3)')
      if (!match) {
        this.removeFiles()
        this.setLog("エラー：拡張子が.oggである必要があります")
        return
      }

      let file: Blob = files[i]

      if (match[1] === 'mp3') {
        file = await mp3ToOgg(file)
      }

      this.sounds[files[i].name] = file
      filenames.push(files[i].name)
    }
    fileInput_name.textContent = filenames.join(' ')
    this.updateNeeded()
  }

  show() {
    this.droparea.classList.remove('hide')
  }

  hide() {
    this.droparea.classList.add('hide')
  }

  getSoundFiles() {
    return this.sounds
  }

  setRequiresdFiles(file_paths: string[]) {
    const new_sounds: { [key: string]: null | Blob } = {}
    file_paths.map(path => {
      const splitted = path.split(/[/\\]/)
      const name = splitted[splitted.length - 1]
      new_sounds[name] = this.sounds[name] ?? null
    })
    if (file_paths.length >= 1) {
      this.show()
    } else {
      this.hide()
    }
    this.sounds = new_sounds
    this.updateNeeded()
  }

  hasEnoughFiles(): boolean {
    return Object.keys(this.sounds).reduce((result: boolean, next: string) => result && (this.sounds[next] ? true : false), true)
  }
}

const fileInput = <HTMLInputElement>document.getElementById('SEinputFile_input')
const fileInput_name = <HTMLInputElement>document.getElementById('SEinputFile_name')
const fileInput_log = <HTMLInputElement>document.getElementById('SEinputFile_log')
const fileInput_needed = <HTMLUListElement>document.getElementById('SEinputFile_needed')
const dropArea = <HTMLInputElement>document.getElementById('SEdropArea')


export const sound_input = new SoundInput({
  dropArea,
  fileInput,
  fileInput_name,
  fileInput_needed,
  fileInput_log
})
