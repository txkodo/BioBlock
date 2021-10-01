// UN USED

type DirectoryChild = Blob|string|{ [key:string] : DirectoryChild }

type TextFile = {}
type BlobFile = {}

type Directory<T extends { [key:string] : DirectoryChild }> = {
  [P in keyof T]: T[P] extends { [key:string] : DirectoryChild }
                    ? Directory<T[P]>
                    : T[P] extends string
                      ? TextFile
                      : BlobFile
                    }

const a: Directory<{
  a:string,
  b:{
    c:string
  }
}> = {a:'aoo',b:{c:'ii'}}

// Directory<{
//   a:{
//     b:{
//       c:string
//     }
//   }
// }>