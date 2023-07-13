const ethers = require('ethers');
const packExternalCall = (
    executionFee,
    fallbackAddress,
    executorAddress,
    allowDelayedExecution,
    requireSuccessfullExecution,
    payload
) => {
    
    // chainEngine uint8, envelope version uint8, bytes envelope
    const dataEnvelope =
        "0x0101" +
        ethers.utils.defaultAbiCoder
            .encode(
                [
                    {
                        type: "tuple",
                        name: "ExternalCallEnvelopV1",
                        components: [
                            { name: "fallbackAddress", type: "address" },
                            { name: "executorAddress", type: "address" },
                            { name: "executionFee", type: "uint160" },
                            { name: "allowDelayedExecution", type: "bool" },
                            { name: "requireSuccessfullExecution", type: "bool" },
                            { name: "payload", type: "bytes" },
                        ],
                    },
                ],
                [
                    {
                        fallbackAddress,
                        executorAddress,
                        executionFee,
                        allowDelayedExecution,
                        requireSuccessfullExecution,
                        payload,
                    },
                ]
            ).replace("0x", "");
    return dataEnvelope;
};

const packPayload = (
    to,
    txGas,
    callData
) => {
    const payload =
        ethers.utils.defaultAbiCoder
            .encode(
                [
                    {
                        type: "tuple",
                        name: "ExternalCallPayload",
                        components: [
                            { name: "to", type: "address" },
                            { name: "txGas", type: "uint32" },
                            { name: "callData", type: "bytes" },
                        ],
                    },
                ],
                [
                    {
                        to,
                        txGas,
                        callData
                    },
                ]
            )
    return payload;
};
exports.packExternalCall = packExternalCall;
exports.packPayload = packPayload;