// Empty module to satisfy ioredis dependency on node:diagnostics_channel
export const channel = () => {}
export const empty = {}
export default { join: (...args: string[]) => args.join("/"), channel, empty }
