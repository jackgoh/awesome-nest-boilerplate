import * as _chains from 'viem/chains';

export const chains = Object.entries(_chains).map(([, chain]) => chain);
