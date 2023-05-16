import Web3 from "web3";

import AAVE from "./aave.json";

export class AaveContractService {
  private readonly contract;

  constructor(private readonly web3: Web3) {
    this.contract = new web3.eth.Contract(AAVE as any);
  }

  supply(
    asset: string,
    amount: string,
    onBehalfOf: string,
    referralCode: number
  ) {
    return this.contract.methods
      .supply(asset, amount, onBehalfOf, referralCode)
      .encodeABI();
  }
}
