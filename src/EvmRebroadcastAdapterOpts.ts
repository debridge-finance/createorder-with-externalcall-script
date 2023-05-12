export class EvmRebroadcastAdapterOpts {
  /**
   * defines a multiplier to increase a pending txn's gasPrice for pushing it off the mempool.
   * Default: 1.15
   */
  bumpGasPriceMultiplier?: number;

  /**
   * defines an interval (in ms) of how often to query RPC to detect if the fulfill txn has been included to the block
   * default: 5_000
   */
  pollingInterval?: number;

  /**
   * max time frame to wait for fulfillment transaction for inclusion. Otherwise, skip fulfillment
   * default: 210_000
   */
  pollingTimeframe?: number;

  /**
   * defines an interval (in ms) of how often to rebroadcast the tx to force its inclusion to the block
   * Default: 60_000
   */
  rebroadcastInterval?: number;

  /**
   * number of attempts to rebroadcast tx with bumped gasPrice
   * default: 3
   */
  rebroadcastMaxAttempts?: number;

  /**
   * gas price cap for bumped gas price during transaction rebroadcasting
   */
  rebroadcastMaxBumpedGasPriceWei?: number;
}
