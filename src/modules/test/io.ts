import { Datapack } from "../util/datapack"

const button = <HTMLButtonElement>document.getElementById('TestButton')

const d = new Datapack()
const f = d.namespace('test').functionFolder.function('test')

f.addCommand('#001')
f.addCommands(['TEST','TESST','TESSST'])
f.addCommand('#002')
f.addCommands(['TEST','TESST','TESSST'],['SUB'])

button.addEventListener('click', async () => {
  saveAs(await d.exportZip(), 'BioBlock_Datapack')
})
