export class DropArea {
  files: FileList|undefined;
  logElem: HTMLElement;
  nemeElem: HTMLElement;

  constructor(option:{
    dropArea: HTMLInputElement,
    fileInput: HTMLInputElement,
    fileInput_name: HTMLElement,
    fileInput_log: HTMLElement,
    onSelected: (f: FileList,dropArea:DropArea) => void
  }) {
    this.files = undefined
    this.nemeElem = option.fileInput_name
    this.logElem  = option.fileInput_log

    const setFiles = (files:FileList) => {
      this.files = files
      let filenames = []
      for(let i=0;i<files.length;i++){
        filenames.push(files[i].name)
      }
      option.fileInput_name.textContent = filenames.join('\n')
      option.fileInput_log.textContent = ''
      option.onSelected(files,this)
    }

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
    option.dropArea.addEventListener('drop', e => {
      e.preventDefault();
      option.dropArea.classList.remove('active');

      // ドロップしたファイルの取得
      const files = e.dataTransfer?.files as FileList;

      // 取得したファイルをinput[type=file]へ
      option.fileInput.files = files;

      setFiles(files)
    })
    
    option.fileInput.addEventListener('change', (e: Event) => {
      const files = (e.target as HTMLInputElement).files as FileList;
      setFiles(files)
      option.fileInput = option.fileInput;
    })
  }
  
  removeFiles(){
    this.files = undefined
    this.nemeElem.textContent = ''
  }

  setFiles(files:FileList){
    this.files = files
  }
  
  getFiles(){
      return this.files
  }

  setLog(error:string){
    this.logElem.textContent = error
  }

  clearLog(){
    this.logElem.textContent = ''
  }
}