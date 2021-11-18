// import { Datapack } from "../util/datapack"

import c3 from "c3";
import { Curve } from "../curve/curve";
import { Curve3D } from "../curve/curve3d";

// const button = <HTMLButtonElement>document.getElementById('TestButton')

// const d = new Datapack()
// const f = d.namespace('test').functionFolder.function('test')

// f.addCommand('#001')
// f.addCommands(['TEST','TESST','TESSST'])
// f.addCommand('#002')
// f.addCommands(['TEST','TESST','TESSST'],['SUB'])

// button.addEventListener('click', async () => {
//   saveAs(await d.exportZip(), 'BioBlock_Datapack')
// })

// const a = new Curve(0)

// a.addPoint(0,0,true)
// a.addPoint(0.5,6,false)
// a.addPoint(1,0,true)
// a.addPoint(1.5,6,false)
// a.addPoint(2,0,true)

// const y:number[] = []
// const x:number[] = []

// for(let i = 0; i <= a.last_point.t + 0.5; i+=0.01){
//   x.push(i)
//   y.push(a.eval(i))
// }

// const chart = c3.generate({
//   data: {
//       xs: {
//           y: 'x',
//       },
//       columns: [
//         ['y',...y],
//         ['x',...x],
//       ],
//       type: 'scatter'
//   },
//   axis: {
//       x: {
//           label: 'Sepal.Width',
//           tick: {
//               fit: true
//           }
//       },
//       y: {
//           label: 'Petal.Width'
//       }
//   }
// })
