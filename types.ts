
export type ChainId = number;

export enum ExecutionStatus {
  PENDING = 'PENDING',
  ROUTING = 'ROUTING',
  BRIDGING = 'BRIDGING',
  SETTLING = 'SETTLING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface UserIntent {
  owner: string;
  sourceChain: ChainId;
  destChain: ChainId;
  amount: string;
  assetIn: string;
  assetOut: string;
  deadline: number;
}
