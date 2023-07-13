# createorder-with-externalcall-script

### About the Script
This script is designed to create a cross-chain order with external contract calls post-execution.

### Setup
To get started, please ensure to set your private key in the .env file.

### Asset Approval
You are required to approve USDC (give token) for the contract address pmmSourceAddress 0x3c7010F5a2eCC2B56BeAE085B6528e492c8b36B6.

### Example 1
The example shows the creation of an order:
0.2 USDC from Polygon is to be transferred to 0.1 USDC on BNB chain and then supplied to the Aave protocol using [default executor](https://vscode.blockscan.com/polygon/0xda315eea73ebda6a920f657b35a954c47c69aa96).   
[Example order](https://test-external-call-auto.debridge.io/order?orderId=0x72d3295be9aab65e731b6d743f2c19665437a7d07a5b0cd44ec22b0d7be5efce).  
To start
```
npm start
```

### Example 2
The example shows the creation of an order:
0.2 USDC from Polygon is to be transferred to 0.1 USDC on BNB chain and then supplied to the Aave protocol using [custom AAVECallExecutor](https://vscode.blockscan.com/polygon/0x4bb55b54bc7cdf15a464fe9f3cd5a71db0a87c75).   
[Example order](https://test-external-call-auto.debridge.io/order?orderId=0x72d3295be9aab65e731b6d743f2c19665437a7d07a5b0cd44ec22b0d7be5efce).  
To start```
npm run aave
```

### Fulfill
The fulfillment of the order can be completed via the [UI](https://test-external-call-auto.debridge.io/orders)
