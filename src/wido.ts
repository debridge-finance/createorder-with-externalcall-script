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
import axios from 'axios';
const widoAPI = new URL("https://api.joinwido.com/quote_v2");

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
* This function create order 0.2 USDC from BNB chain to 0.1 USDC in Polygon and swap to USDT through Wido router
*/
async function swapWido() {

  const receiver = "0x919dF3aDbF5cfC9fcfd43198EDFe5aA5561CB456"; // WIDO
  const executorAddress = "0x5065dB65612C1064D52d6528d4E03c9A12032629"; //WidoCallExecutor
  const executionFee = 0;
  const safeTxGas = 0;
  const giveChainId = ChainId.BSC;
  const takeChainId = ChainId.Polygon;

  const giveWeb3 = web3Map[giveChainId];
  const walletAddress = giveWeb3.eth.defaultAccount!;

  const provider = new EvmProviderAdapter(giveWeb3);

  const giveTokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // USDC in the bnb chain
  const giveTokenAmount = 200000000000000000n; // 0.2 USDC

  const takeTokenAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"; // USDC in the polygon
  const takeTokenAmount = 100_000n; // 0.1 USDC


  // Create callData to swap through WIDO router
  let params: QuoteParams = {
    "from_chain_id": takeChainId,
    "from_token": takeTokenAddress,
    "to_chain_id": takeChainId,
    "to_token": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // polygon USDT
    "slippage_percentage": 0.03,
    "amount": takeTokenAmount.toString(),
    "user": executorAddress,
    "partner": walletAddress,
    "recipient": walletAddress
  };

  const quoteURL = setQueryStringParameters(widoAPI, params);
  const widoResponse = await fetchData(quoteURL);
  const callData = widoResponse.data;  

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


interface QuoteParams {
  from_chain_id: number;
  from_token: string;
  to_chain_id: number;
  to_token: string;
  slippage_percentage: number;
  amount: string;
  user: string;
  partner: string;
  recipient: string;
}

function setQueryStringParameters(url: URL, params: QuoteParams): URL {
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key as keyof QuoteParams].toString()));
  return url;
}


async function fetchData(url: URL): Promise<any> {
  try {
    const response = await axios.get(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

swapWido();
