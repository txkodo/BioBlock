import JSZip from "jszip";
import { saveAs } from 'file-saver';

export const base64ToBlob = (base64Data:string,contentType:string) => {
  const byteCharacters = window.atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], {type: contentType});
}

export interface directoryHierarchy{
  [filename:string]:string|Blob|directoryHierarchy
}

export const objectToZip = (object:directoryHierarchy) => {
  const zip = new JSZip()
  const recursive = (folder:JSZip,object:directoryHierarchy) => {
    Object.keys(object).forEach((filename:string) => {
      const file = object[filename]
      if (typeof file == 'string'){
        folder.file(filename,file)
      } else if (file instanceof Blob){
        folder.file(filename,file,{ binary: true })
      } else {
        const child_folder = folder.folder(filename)
        if (child_folder){
          recursive(child_folder,file)
        }
      }
    });
  }
  recursive(zip,object)
  return zip
}

export const saveZip = async (zip:JSZip) => {
  saveAs(await zip.generateAsync({type:"blob"}), "signUI.zip")
}

/*
 * 再帰的なオブジェクトのマージ
 */
export const merge_directoryHierarchy = (a:directoryHierarchy, b:directoryHierarchy) => {
	Object.keys(b).forEach( key => {
		a[key] = (key in a)
			? ((typeof a[key] === "object" && typeof b[key] === "object")
				? merge_directoryHierarchy(a[key] as directoryHierarchy, b[key] as directoryHierarchy) : b[key]) : b[key];
	});
	return a;
};
