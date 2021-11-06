export class TextInput{
  onchanged:(()=>void) = () => {}
  element: HTMLInputElement;
  
  constructor(input:HTMLInputElement){
    this.element = input
    input.onchange = (ev:Event) => this.onchanged()
  }
  get value(){
    return this.element.value
  }
  get valid(){
    return this.element.validity.valid
  }
}

const item_id_element = <HTMLInputElement>document.getElementById('itemId')
export const item_id = new TextInput(item_id_element)

const custom_model_data_element = <HTMLInputElement>document.getElementById('customModelData')
export const custom_model_data = new TextInput(custom_model_data_element)
