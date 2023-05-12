const ethers = require('ethers');
const packExternalCall = (
    executionFee,
    fallbackAddress,
    safeTxGas,
    executor,
    allowDelayedExecution,
    requireSuccessfullExecution,
    callData
) => {
    // envelope version uint8, bytes envelope
    const dataEnvelope =
        "0x01" +
        ethers.utils.defaultAbiCoder
            .encode(
                [
                    {
                        type: "tuple",
                        name: "DataEnvelopV1",
                        components: [
                            { name: "safeTxGas", type: "uint32" },
                            { name: "allowDelayedExecution", type: "bool" },
                            { name: "requireSuccessfullExecution", type: "bool" },
                            { name: "executor", type: "address" },
                            { name: "callData", type: "bytes" },
                        ],
                    },
                ],
                [
                    {
                        safeTxGas,
                        allowDelayedExecution,
                        requireSuccessfullExecution,
                        executor,
                        callData,
                    },
                ]
            )
            .replace("0x", "");

    // const dataEnvelope = "0x11223344";
    // console.log("dataEnvelope", dataEnvelope);

    const params = { executionFee, fallbackAddress, dataEnvelope };
    const packed = ethers.utils.defaultAbiCoder.encode(
        [
            {
                type: "tuple",
                name: "ExternalCall",
                components: [
                    { name: "executionFee", type: "uint256" },
                    { name: "fallbackAddress", type: "bytes" },
                    { name: "dataEnvelope", type: "bytes" },
                ],
            },
        ],
        [params]
    );
    return packed;
};

exports.packExternalCall = packExternalCall;