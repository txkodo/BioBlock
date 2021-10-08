
export const base64mimeToBlob = (base64mime:string) => {
  const match = base64mime.match(/data:([a-zA-Z+_-]+\/[a-zA-Z+_-]+);base64,([a-zA-Z0-9+/]+=*)/)
  if (match === null){ throw new Error(`invalid base64 string: ${base64mime}`) }
  const [_,contentType,base64Data] = match

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
