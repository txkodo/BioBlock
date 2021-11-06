export class DropArea {
  files: FileList | undefined;
  logElem: HTMLElement;
  nemeElem: HTMLElement;
  droparea: HTMLInputElement;

  constructor(option: {
    dropArea: HTMLInputElement,
    fileInput: HTMLInputElement,
    fileInput_name: HTMLElement,
    fileInput_log: HTMLElement
  }) {
    this.droparea = option.dropArea
    this.files = undefined
    this.nemeElem = option.fileInput_name
    this.logElem = option.fileInput_log

    // ドラッグオーバー
    option.dropArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      option.dropArea.classList.add('active');
    });

    // ドラッグアウト
    option.dropArea.addEventListener('dragleave', e => {
      e.preventDefault();
      option.dropArea.classList.remove('active');
    });

    // ドロップ時の処理
    option.dropArea.addEventListener('drop', async e => {
      e.preventDefault();
      option.dropArea.classList.remove('active');

      // ドロップしたファイルの取得
      const files = e.dataTransfer?.files as FileList;

      // 取得したファイルをinput[type=file]へ
      option.fileInput.files = files;

      await this.setFiles(files)
    })

    option.fileInput.addEventListener('change', async (e: Event) => {
      const files = (e.target as HTMLInputElement).files as FileList;
      await this.setFiles(files)
      option.fileInput = option.fileInput;
    })
  }

  async setFiles(file: FileList) {
    throw new Error("Method not implemented.");
  }

  error(log:string) {
    this.removeFiles()
    this.setLog(log)
  }

  removeFiles() {
    this.files = undefined
    this.nemeElem.textContent = ''
  }

  getFiles() {
    return this.files
  }

  setLog(error: string) {
    this.logElem.textContent = error
  }

  clearLog() {
    this.logElem.textContent = ''
  }
}