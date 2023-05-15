import {
  ChainId,
  Evm,
  OrderData,
  PMMClient,
  tokenStringToBuffer,
} from "@debridge-finance/dln-client";
import { config } from "dotenv";
import Web3 from "web3";

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
const address = process.env.WALLET!;

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

async function start() {
  // supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)
  const receiver = "0x794a61358d6845594f94dc1db02a252b5b4814ad"; //Aave: Pool V3

  const callData =
    "0x617ba0370000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000b779daead6031ef189cad4ac438c991efe7635a70000000000000000000000000000000000000000000000000000000000000000";
  const executionFee = 0;
  const safeTxGas = 1_000_000;
  const giveChainId = ChainId.BSC;
  const takeChainId = ChainId.Polygon;
  const order: OrderData = {
    maker: tokenStringToBuffer(giveChainId, address),
    give: {
      tokenAddress: tokenStringToBuffer(
        giveChainId,
        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC in the bnb chain
      ),
      chainId: giveChainId,
      amount: 1100000000000000000n, //1.1 USDC
    },
    take: {
      tokenAddress: tokenStringToBuffer(
        takeChainId,
        "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC in the polygon
      ),
      chainId: takeChainId,
      amount: 1_000_000n, //1 USDC
    },
    receiver: tokenStringToBuffer(takeChainId, receiver),
    givePatchAuthority: tokenStringToBuffer(giveChainId, address),
    orderAuthorityDstAddress: tokenStringToBuffer(takeChainId, address),
    externalCall: packExternalCall(
      executionFee,
      address,
      safeTxGas,
      "0x0000000000000000000000000000000000000000",
      false,
      true,
      callData
    ),
    allowedTaker: undefined,
    allowedCancelBeneficiary: undefined,
  } as unknown as OrderData;

  const giveWeb3 = web3Map[giveChainId];
  const provider = new EvmProviderAdapter(giveWeb3);

  const res = await pmmClient.createOrder(order, 0, undefined, {
    permit: "0x",
    giveWeb3,
  });

  console.log(res);

  await provider.sendTransaction(res);
}

start();
