import BigNumber from "bignumber.js";
import { clearInterval, clearTimeout } from "timers";
import Web3 from "web3";

import { EvmRebroadcastAdapterOpts } from "./EvmRebroadcastAdapterOpts";

class Tx {
  data: string;
  to: string;
  value: number;

  from?: string;
  gasPrice?: string;
  gasLimit?: number;
  nonce?: number;
}

export class EvmProviderAdapter {
  wallet: never;

  private staleTx?: Tx;

  private rebroadcast: EvmRebroadcastAdapterOpts = {};

  constructor(
    public readonly connection: Web3,
    rebroadcast?: EvmRebroadcastAdapterOpts
  ) {
    this.fillDefaultVariables(rebroadcast);
  }

  public get address(): string {
    return this.connection.eth.defaultAccount!;
  }

  async sendTransaction(data: unknown) {
    const tx = data as Tx;
    const nonce = await this.connection.eth.getTransactionCount(
      this.connection.eth.defaultAccount!
    );
    let nextGasPrice = await this.connection.eth.getGasPrice();

    // {{{ DEBUG
    // For Polygon: you can decrease current gasPrice by 10% to test poller
    // nextGasPrice = new BigNumber(nextGasPrice).multipliedBy(0.9).toFixed(0);
    // }}}

    if (this.staleTx && this.staleTx.nonce! >= nonce) {
      nextGasPrice = BigNumber.max(
        nextGasPrice,
        new BigNumber(this.staleTx.gasPrice!).multipliedBy(
          this.rebroadcast.bumpGasPriceMultiplier!
        )
      ).toFixed(0);
    }

    const currentTx = {
      ...tx,
      nonce,
      gasPrice: nextGasPrice,
    } as Tx;
    let currentTxHash: string;

    const transactionHash = await new Promise(async (resolve, reject) => {
      let rebroadcastInterval: NodeJS.Timer;
      let pollingInterval: NodeJS.Timer;
      let timeout: NodeJS.Timer;

      const clearTimers = () => {
        clearInterval(rebroadcastInterval);
        clearInterval(pollingInterval);
        clearTimeout(timeout);
      };

      const success = (v: any) => {
        this.staleTx = undefined;
        clearTimers();
        resolve(v);
      };

      const failWithUndeterminedBehavior = (message: string) => {
        console.error(
          `Cannot confirm tx ${currentTxHash}, marking it as stale for future replacement. Reason: ${message}`
        );
        this.staleTx = currentTx;
        clearTimers();
        reject(message);
      };

      const fail = (message: string) => {
        clearTimers();
        reject(message);
      };

      try {
        currentTxHash = await this.sendTx(currentTx);

        pollingInterval = setInterval(async () => {
          try {
            console.debug(`start polling...`);

            const transactionReceiptResult =
              await this.connection.eth.getTransactionReceipt(currentTxHash);
            console.debug(
              `poller received tx receipt, status: ${transactionReceiptResult?.status}`
            );

            if (transactionReceiptResult?.status === true) {
              console.debug(`tx confirmed`);

              success(currentTxHash);
            } else if (transactionReceiptResult?.status === false) {
              console.debug(`tx reverted`);

              fail(`tx ${currentTxHash} reverted`);
            }
          } catch (e) {
            console.error(`poller raised an error: ${e}`);
            // todo discuss should we throw here
          }
        }, this.rebroadcast.pollingInterval);

        let attemptsRebroadcast = 0;
        rebroadcastInterval = setInterval(async () => {
          try {
            console.debug(`rebroadcasting`);

            if (
              this.rebroadcast.rebroadcastMaxAttempts === attemptsRebroadcast
            ) {
              console.debug(
                `no more attempts (${attemptsRebroadcast}/${this.rebroadcast.rebroadcastMaxAttempts})`
              );

              failWithUndeterminedBehavior(`rebroadcasting aborted`);
            }

            // pick gas price for bumping
            const currentGasPrice = await this.connection.eth.getGasPrice();
            const bumpedGasPrice = new BigNumber(nextGasPrice).multipliedBy(
              this.rebroadcast.bumpGasPriceMultiplier!
            );
            nextGasPrice = BigNumber.max(
              currentGasPrice,
              bumpedGasPrice
            ).toFixed(0);
            console.debug(
              `picking bumped gas: current=${currentGasPrice}, bumped=${bumpedGasPrice}, picked=${nextGasPrice}`
            );

            // check bumped gas price
            if (
              this.rebroadcast.rebroadcastMaxBumpedGasPriceWei &&
              new BigNumber(nextGasPrice).gt(
                this.rebroadcast.rebroadcastMaxBumpedGasPriceWei
              )
            ) {
              console.debug(
                `picked gas price for bump (${nextGasPrice}) reached max bumped gas price (${this.rebroadcast.rebroadcastMaxBumpedGasPriceWei})`
              );
              failWithUndeterminedBehavior(`rebroadcasting aborted`);
            }

            // run re-broadcast
            currentTx.gasPrice = nextGasPrice;
            attemptsRebroadcast++;
            const rebroadcastedTxHash = await this.sendTx(currentTx);
            console.debug(`rebroadcasted as ${rebroadcastedTxHash}`);
            currentTxHash = rebroadcastedTxHash;
          } catch (e) {
            console.error(`rebroadcast raised an error: ${e}`);
            console.error(e);
            // fail(`rebroadcasting ${currentTxHash} raised an error: ${e}`);
          }
        }, this.rebroadcast.rebroadcastInterval);

        timeout = setTimeout(() => {
          console.error(
            `poller reached timeout of ${this.rebroadcast.pollingTimeframe}ms`
          );
          failWithUndeterminedBehavior("poller reached timeout");
        }, this.rebroadcast.pollingTimeframe);
      } catch (e) {
        console.error(`sending tx failed: ${e}`);
        console.error(e);
        fail(`sending tx failed`);
      }
    });

    console.log(`tx confirmed: ${transactionHash}`);

    return transactionHash;
  }

  private async sendTx(tx: Tx): Promise<string> {
    return new Promise(async (resolve, reject) => {
      tx.from = this.connection.eth.defaultAccount!;

      let estimatedGas: number = 0;
      try {
        estimatedGas = await this.connection.eth.estimateGas(tx);
      } catch (error) {
        console.error(
          `estimation failed: ${error}, tx: ${JSON.stringify(tx)}`,
          error
        );
        reject(error);
      }

      const txForSign = {
        ...tx,
        gas: (estimatedGas * 1.1).toFixed(0),
      };
      console.debug(`sending tx: ${JSON.stringify(txForSign)}`);
      this.connection.eth
        .sendTransaction(txForSign)
        .once("transactionHash", (hash: string) => {
          console.debug(`tx sent, txHash: ${hash}`);
          resolve(hash);
        })
        .catch((error) => {
          console.error("sending failed");
          console.error(error);
          reject(error);
        });
    });
  }

  private fillDefaultVariables(rebroadcast?: EvmRebroadcastAdapterOpts) {
    if (rebroadcast) {
      this.rebroadcast = { ...rebroadcast };
    }
    if (rebroadcast?.rebroadcastInterval === undefined) {
      this.rebroadcast.rebroadcastInterval = 60_000;
    }

    if (rebroadcast?.rebroadcastMaxAttempts === undefined) {
      this.rebroadcast.rebroadcastMaxAttempts = 3;
    }

    if (rebroadcast?.rebroadcastMaxBumpedGasPriceWei === undefined) {
      this.rebroadcast.rebroadcastMaxBumpedGasPriceWei = undefined;
    }

    if (rebroadcast?.bumpGasPriceMultiplier === undefined) {
      this.rebroadcast.bumpGasPriceMultiplier = 1.15;
    }

    if (rebroadcast?.pollingTimeframe === undefined) {
      this.rebroadcast.pollingTimeframe = 210_000;
    }

    if (this.rebroadcast.pollingInterval === undefined) {
      this.rebroadcast.pollingInterval = 5_000;
    }
  }
}
