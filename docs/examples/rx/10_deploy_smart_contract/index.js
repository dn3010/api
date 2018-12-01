// Required imports
const { switchMap } = require('rxjs/operators');
const { ApiRx } = require('@polkadot/api');
const { WsProvider } = require('@polkadot/rpc-provider');

// Initialise the provider to connect to the local node
const wsProvider = new WsProvider('ws://127.0.0.1:9944');

// Known account we want to use (available on dev chain, with funds)
const Alice = '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ';

async function main () {
  // Declare value to send to smart contract, gas limit, initial code, and data
  const contractValue = 1000;
  const gasLimit = 0.1;
  const initCode = new Uint8Array([4 << 2, 0xde, 0xad, 0xbe, 0xef]);
  const data = new Uint8Array([4 << 2, 0xde, 0xad, 0xbe, 0xef]);

  const api = await ApiRx.create(wsProvider);

  // Create Smart Contract. Use the Extrinsics (runtime) Node Interface.
  const chainDeploymentHash = await api.tx.contract.create(contractValue, gasLimit, initCode, data);
  console.log(`Contract deployed for Alice: ${chainDeploymentHash}`);

  // Create API. Wait until ready. Subscribe to API changes. Pass optional provider.
  api
    .pipe(
      switchMap(async (api) => await api.tx.contract.call(Alice, contractValue, gasLimit, data))
    )
    // Subscribe to retrieve Smart Contract.
    .subscribe((contractRetrievedHash) => {
      console.log(`Retrieved hash of smart contract deployed by Alice:: ${contractRetrievedHash}`);
      process.exit()
    });
}

main().catch(console.error);
