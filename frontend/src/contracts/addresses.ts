import addressesJson from './addresses.json'

const NETWORK = (process.env.NEXT_PUBLIC_NETWORK as string) || 'localhost'

export const CONTRACTS = addressesJson[NETWORK] || addressesJson['localhost']

export default CONTRACTS
