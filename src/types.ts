import { DecodedParams } from "web3";

export interface Tx {
  id: string;
  removed: boolean;
  logIndex: bigint;
  transactionIndex: bigint;
  transactionHash: string;
  blockHash: string;
  blockNumber: bigint;
  address: string;
  data: string;
  topics: string[];
}

export interface TransferDecodedParam extends DecodedParams {
  from: string;
  to: string;
  amount: bigint;
}

export interface RequestDecodedParam extends DecodedParams {
  currentChainId : bigint;
  nextChainId: bigint;
  nextRequestId: string;
  result: string;
  lastOp: bigint;
}

export interface TxLog{
  topics: string[];
  data: string;
}