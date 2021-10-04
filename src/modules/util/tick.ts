
export type time = number

export type tick = number

export const time_to_tick = (time:time):tick => Math.round(time*20)
