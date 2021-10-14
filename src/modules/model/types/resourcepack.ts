export type sound_element_json = {
  replace: true,
  sounds: [
    {
      name: string,
      volume: number
    }
  ]
}

export type sound_json = {
  [idx: string]: sound_element_json
}

