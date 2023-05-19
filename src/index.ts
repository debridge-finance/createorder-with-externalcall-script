import {
  ChainId,
  Evm,
  OrderData,
  PMMClient,
  tokenStringToBuffer,
} from "@debridge-finance/dln-client";
import { config } from "dotenv";
import Web3 from "web3";

import { AaveContractService } from "./aave-contract.service";
import { EvmProviderAdapter } from "./evm.provider.adapter";
import { packExternalCall } from "./packExternalCall";

config();

function createWeb3WithPrivateKey(rpc: string, privateKey: string) {
  const web3 = new Web3(rpc);
  const accountEvmFromPrivateKey =
    web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(accountEvmFromPrivateKey);
  web3.eth.defaultAccount = accountEvmFromPrivateKey.address;

  return web3;
}

const privateKey = process.env.PRIVATE_KEY!;

const web3Map = {
  [ChainId.Polygon]: createWeb3WithPrivateKey(
    "https://polygon-rpc.com",
    privateKey
  ),
  [ChainId.BSC]: createWeb3WithPrivateKey(
    "https://bsc-dataseed4.ninicoin.io",
    privateKey
  ),
};

// @ts-ignore
const evmClient = new Evm.PmmEvmClient({
  enableContractsCache: true,
  addresses: {
    [ChainId.Polygon]: {
      pmmDestinationAddress: "0x08F20E7Ace48dAe4806A96b88386E62b2C161054",
      pmmSourceAddress: "0x3c7010F5a2eCC2B56BeAE085B6528e492c8b36B6",
      deBridgeGateAddress: "string;", // todo
      crossChainForwarderAddress: "string;", // todo
    },
    [ChainId.BSC]: {
      pmmDestinationAddress: "0x08F20E7Ace48dAe4806A96b88386E62b2C161054",
      pmmSourceAddress: "0x3c7010F5a2eCC2B56BeAE085B6528e492c8b36B6",
      deBridgeGateAddress: "string;", // todo
      crossChainForwarderAddress: "string;", // todo
    },
  },
});
const pmmClient = new PMMClient({
  [ChainId.BSC]: evmClient,
  [ChainId.Polygon]: evmClient,
  [ChainId.Avalanche]: evmClient,
});


/* 
* This function create order 0.2 USDC from BNB chain to 0.1 USDC in Polygon and supply assets to the Aave protocol.
*/
async function supplyToAave() {
  
  // supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)
  const receiver = "0x794a61358d6845594f94dc1db02a252b5b4814ad"; // Aave: Pool V3
  // const executorAddress = "0xAD8917fD27ce6bb79Eda5FE8331955a52ae5dA63"; // It's custom AAVECallExecutor
  // const callData = walletAddress; // if used AAVECallExecutor
  const executorAddress = "0x0000000000000000000000000000000000000000";
  const executionFee = 0;
  const safeTxGas = 1_000_000;
  const giveChainId = ChainId.BSC;
  const takeChainId = ChainId.Polygon;

  const giveWeb3 = web3Map[giveChainId];
  const walletAddress = giveWeb3.eth.defaultAccount!;
  const aaveContractService = new AaveContractService(giveWeb3);
  const provider = new EvmProviderAdapter(giveWeb3);

  const takeTokenAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"; // USDC in the polygon
  const takeTokenAmount = 100_000n;

  const giveTokenAmount = 200000000000000000n; // 0.2 USDC

  // Create callData to supply in the Aave protocol
  const callData = aaveContractService.supply(
    takeTokenAddress,
    takeTokenAmount.toString(),
    walletAddress,
    0, //referralCode
  );
  
  const giveTokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // USDC in the bnb chain

  const order: OrderData = createOrderData(walletAddress, giveChainId, giveTokenAddress, giveTokenAmount, takeChainId,
    takeTokenAddress, takeTokenAmount, receiver, executionFee, callData, safeTxGas, executorAddress);

  const res = await pmmClient.createOrder(order, 0, undefined, {
    permit: "0x",
    giveWeb3,
  });

  console.log(res);

  await provider.sendTransaction(res);
}


function createOrderData(
  walletAddress: string,
  giveChainId: ChainId,
  giveTokenAddress: string,
  giveTokenAmount: bigint,
  takeChainId: ChainId,
  takeTokenAddress: string,
  takeTokenAmount: bigint,
  receiver: string,
  executionFee: number,
  callData: string,
  safeTxGas: number = 0,
  executor: string = "0x0000000000000000000000000000000000000000"): OrderData {
  return {
    maker: tokenStringToBuffer(giveChainId, walletAddress),
    give: {
      tokenAddress: tokenStringToBuffer(giveChainId, giveTokenAddress),
      chainId: giveChainId,
      amount: giveTokenAmount,
    },
    take: {
      tokenAddress: tokenStringToBuffer(takeChainId, takeTokenAddress),
      chainId: takeChainId,
      amount: takeTokenAmount,
    },
    receiver: tokenStringToBuffer(takeChainId, receiver),
    givePatchAuthority: tokenStringToBuffer(giveChainId, walletAddress),
    orderAuthorityDstAddress: tokenStringToBuffer(takeChainId, walletAddress),
    externalCall: packExternalCall(
      executionFee,
      walletAddress,
      safeTxGas,
      executor,
      false, //allowDelayedExecution,
      true,  //requireSuccessfullExecution,
      callData
    ),
    allowedTaker: undefined,
    allowedCancelBeneficiary: undefined,
  } as unknown as OrderData;
}


supplyToAave();
