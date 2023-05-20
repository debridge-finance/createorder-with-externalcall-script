# createorder-with-externalcall-script

### About the Script
This script is designed to create a cross-chain order with external contract calls post-execution.

### Setup
To get started, please ensure to set your private key in the .env file.

### Asset Approval
You are required to approve USDC (give token) for the contract address pmmSourceAddress 0x3c7010F5a2eCC2B56BeAE085B6528e492c8b36B6.

### Example 1
The example shows the creation of an order:
0.2 USDC from Polygon is to be transferred to 0.1 USDC on BNB chain and then supplied to the Aave protocol.
[Example order](https://test-external-call-auto.debridge.io/order?orderId=0xd44b7f996f4175ff18d8d142bc5d3052edd842904b4fcbf9fe36dfd498d51aa4)
To start
```
npm start
```

### Example 2
The example shows the creation of an order:
0.2 USDC from Polygon is to be transferred to 0.1 USDC on BNB chain and then swaped to USDT through Wido router.
[Example order](https://test-external-call-auto.debridge.io/order?orderId=0x44e202d1ff5d9c6ce962ebce812ca883cde6e9d6ca5e1299c019d303988a9408)
To start
```
npm run wido
```

### Fulfill
The fulfillment of the order can be completed via the [UI](https://test-external-call-auto.debridge.io/orders)
