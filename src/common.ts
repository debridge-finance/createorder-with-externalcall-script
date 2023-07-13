import {
    ChainId,
    Evm,
    OrderData,
    PMMClient,
    tokenStringToBuffer,
} from "@debridge-finance/dln-client";

import { packExternalCall, packPayload } from "./packExternalCall";
import Web3 from "web3";
import { config } from "dotenv";

config();

export const privateKey = process.env.PRIVATE_KEY!;
export const web3Map = {
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
export const evmClient = new Evm.PmmEvmClient({
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
export const pmmClient = new PMMClient({
    [ChainId.BSC]: evmClient,
    [ChainId.Polygon]: evmClient,
    [ChainId.Avalanche]: evmClient,
});

export function createWeb3WithPrivateKey(rpc: string, privateKey: string) {
    const web3 = new Web3(rpc);
    const accountEvmFromPrivateKey =
        web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(accountEvmFromPrivateKey);
    web3.eth.defaultAccount = accountEvmFromPrivateKey.address;

    return web3;
}


export function createOrderData(
    walletAddress: string,
    giveChainId: ChainId,
    giveTokenAddress: string,
    giveTokenAmount: bigint,
    takeChainId: ChainId,
    takeTokenAddress: string,
    takeTokenAmount: bigint,
    receiver: string,
    executionFee: number,
    // toExternalCallContract: string,
    payload: string,
    // safeTxGas: number = 0,
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
            executor,
            false, //allowDelayedExecution,
            true,  //requireSuccessfullExecution,
            payload,
        ),
        allowedTaker: undefined,
        allowedCancelBeneficiary: undefined,
    } as unknown as OrderData;
}
