import {
  ChainId,
  OrderData,
} from "@debridge-finance/dln-client";
import { config } from "dotenv";


import { AaveContractService } from "./aave-contract.service";
import { createOrderData, pmmClient, web3Map } from "./common";
import { EvmProviderAdapter } from "./evm.provider.adapter";
import { packPayload } from "./packExternalCall";

config();

/* 
* This function create order 0.2 USDC from BNB chain to 0.1 USDC in Polygon and supply assets to the Aave protocol.
*/
async function supplyToAave() {
  console.log("Supply to AAVE using default executor");
  
  const receiver = "0x0000000000000000000000000000000000000000"; // receiver doesn't use in contract logic with ext call
  
  const poolAddress = "0x794a61358d6845594f94dc1db02a252b5b4814ad"; // Aave: Pool V3
  const executorAddress = "0x0000000000000000000000000000000000000000";
  const executionFee = 0;
  const safeTxGas = 0;
  const giveChainId = ChainId.BSC;
  const takeChainId = ChainId.Polygon;

  const giveWeb3 = web3Map[giveChainId];
  const walletAddress = giveWeb3.eth.defaultAccount!;
  const aaveContractService = new AaveContractService(giveWeb3);
  const provider = new EvmProviderAdapter(giveWeb3);

  const giveTokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // USDC in the bnb chain
  const giveTokenAmount = 200000000000000000n; // 0.2 USDC

  const takeTokenAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"; // USDC in the polygon
  const takeTokenAmount = 100_000n; // 0.1 USDC

  console.log(`Give chain: ${giveChainId}`);
  console.log(`Take chain: ${takeChainId}`);
  console.log(`Give token amount: ${giveTokenAmount}`);
  console.log(`Take token amount: ${takeTokenAmount}`);

  // Create callData to supply in the Aave protocol
  // supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)
  const callData = aaveContractService.supply(
    takeTokenAddress,
    takeTokenAmount.toString(),
    walletAddress,
    0, //referralCode
  );

  const extCallPayload = packPayload(poolAddress, safeTxGas, callData)
  const order: OrderData = createOrderData(walletAddress, giveChainId, giveTokenAddress, giveTokenAmount, takeChainId,
    takeTokenAddress, takeTokenAmount, receiver, executionFee, extCallPayload, executorAddress);

  const res = await pmmClient.createOrder(order, 0, undefined, {
    permit: "0x",
    giveWeb3,
  });

  console.log(res);
  await provider.sendTransaction(res);
}

supplyToAave();
