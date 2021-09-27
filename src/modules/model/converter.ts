// import { vec3 } from "../vector";

// interface display {
//   rotation?: vec3
//   scale?: vec3
//   translation?: vec3
// }

// interface blockface {
//   uv:[number,number,number,number]
//   texture:string
// }

// interface blockelement {
//   from: vec3
//   to: vec3
//   origin:vec3
//   rotation?:vec3
//   faces:{
//     north?:face
//     south?:face
//     east? :face
//     west? :face
//     up?   :face
//     down? :face
//   }
// }

// interface blockmodel {
//   textures: {
//     [index: string]: string
//   }
//   elements: blockelement[]
//   display: {
//     head: display
//   }
// }

// export class BBmodelLoder {
//   bbmodel: bbmodel
//   blockmodels: blockmodel[]
//   constructor(bbmodel: bbmodel) {
//     this.bbmodel = bbmodel
//     this.blockmodels = []

//     bbmodel.elements.forEach(element => {
//       const blockmodel: blockmodel = {
//         textures: {},
//         elements: [
//           {
//             from:element.from,
//             to:element.to,
//             faces:element.faces,
//             origin:[0,0,0]
//           }
//         ],
//         display: {
//           head: {
//             rotation: [0, -180, 0],
//             scale: [1.6, 1.6, 1.6],
//             translation: [-3.25, 6.5, 0]
//           }
//         }
//       }
//       this.blockmodels.push(blockmodel)
//       element
//     });
//   }
// }