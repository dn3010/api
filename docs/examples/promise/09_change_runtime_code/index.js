const moment = require('moment');
const { stringShorten } = require('@polkadot/util');

// Import the API and WebSockets provider
const { ApiPromise } = require('@polkadot/api');
const { WsProvider } = require('@polkadot/rpc-provider');

// Declare a known account to use (available on dev chain with funds)
const Alice = '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ';

async function main () {
  // Initialise the provider to connect to the local node
  const provider = new WsProvider('ws://127.0.0.1:9944');

  // Create the API and wait until ready
  const api = await ApiPromise.create(provider);

  // Query the Existing Runtime Code stored on-chain
  // Use the Storage chain state (runtime) Node Interface.
  const existingRuntimeCode = await api.query.substrate.code();

  // Show the first 512-odd chars of the code
  console.log('Existing runtime code: ', stringShorten(existingRuntimeCode.toHex(), 7)); // Ox

  // Retrieve Alice's Free Balance to check for sufficient balance to
  // start a Referendum and obtain enough votes for obtain approval
  // to change the runtime code.
  let aliceBalance = await api.query.balances.freeBalance(Alice);
  console.log(`Balance available for Alice: ${aliceBalance}`);

  // Submit a Public Proposal to change the Runtime Code.
  // Since code is Bytes it expects Uint8Array and also
  // it needs the length prefix applied.
  // Bytes are encoded with Compact encoded length + data.
  // So [0] would set length to 0 for the empty value below.
  // Note that '0x1337' would not work.
  // Attempted arg1:
  // - new Uint8Array([0])
  // - new Uint8Array([2 << 2, 0x13, 0x37])
  //   (i.e. 2 byte length is compact encoded via the shift)
  // - new Uint8Array([4 << 2, 0xde, 0xad, 0xbe, 0xef])
  //
  const proposedNewRuntimeCode = new Uint8Array([4 << 2, 0xde, 0xad, 0xbe, 0xef]);
  const proposalToSetCode = await api.tx.consensus.setCode(proposedNewRuntimeCode);

  // Submit a Public Proposal to change the the Runtime Code
  const proposalSubmitted = await api.tx.democracy.propose(proposalToSetCode, 100000);
  console.log(`Proposal submitted: ${proposalSubmitted}`);

  let [publicProposals, minimumReferendumDeposit] = await Promise.all([
    api.query.democracy.publicProps(),
    api.query.democracy.minimumDeposit()
  ]);

  if (!publicProposals.length) {
    console.log('No public proposals');
  } else {
    console.log(`Public proposal count: ${publicProposals.length}\n`);
    console.log(`Public proposals:\n`);
    publicProposals.forEach((publicProposal, i) => {
      console.log(`\tPublic proposal ${i}: ${publicProposal.toString()}`);
    });
  }

  console.log('\nMinimum deposit required to start a referendum: ', minimumReferendumDeposit.toNumber());

  // Start a Public Referendum with a vote threshold of 'Super majority approval' (index of 0)
  const referendumPublicId = await api.tx.democracy.startReferendum(proposalSubmitted, 0);
  console.log(`Public Proposed Referendum with ID started: ${referendumPublicId}`);

  const [referendumCount, referendumInfo, votingPeriod] = await Promise.all([
    api.query.democracy.referendumCount(),
    api.query.democracy.referendumInfoOf(referendumPublicId),
    api.query.democracy.votingPeriod()
  ]);

  console.log(`Current amount of public referendums: ${referendumCount}`);
  console.log(`Info about public referendum ID ${referendumPublicId}:`);
  console.log(`\tBlock number: ${referendumInfo.getAtIndex(0).toNumber()}`);
  console.log(`\tProposal: ${referendumInfo.getAtIndex(1).callIndex}`);
  console.log(`\tVote threshold: ${referendumInfo.getAtIndex(2).toNumber()}`);

  console.log(`Voting period (frequency in blocks checking for new votes): `, votingPeriod.toNumber());

  // Vote on a Referendum ID in the Proposed Public Referenda (before Voting Period expires)
  const voteYay = true;
  const votedProposedPublicReferendumHash = await api.tx.democracy.vote(referendumPublicId, voteYay);
  console.log(`Voted for Proposed Public Referendum ID ${referendumPublicId}: ${voteYay ? 'yay' : 'nay'}`);

  const launchPeriod = await api.query.democracy.launchPeriod();
  console.log(`Launch period (frequency in blocks new Proposed Public Referenda are launched active): `, launchPeriod.toNumber());
  
  // Wait unit the referendum becomes an active
  const blockPeriod = await api.query.timestamp.blockPeriod();
  console.log(`Block period (milliseconds): ${moment(blockPeriod).valueOf()}`);

  let startBlockNumber = undefined;

  // Subscribe to the new headers on-chain. The callback is fired when new headers
  // are found, the call itself returns a promise with a subscription that can be
  // used to unsubscribe from the newHead subscription
  const subscriptionId = await api.rpc.chain.subscribeNewHead((header) => {
    console.log(`best block number #${header.blockNumber}`);
    bestBlock = header.blockNumber;
    startBlockNumber = startBlockNumber || bestBlock;

    // Exit at end of launch period
    if (bestBlock == startBlockNumber.toNumber() + launchPeriod.toNumber()) {
      console.log(`End of launch period`);
      process.exit()
    }
  });

  // Vote on the Referendum ID in the Active Referenda (before Launch Period expires)
  const votedActiveReferendumHash = await api.tx.democracy.vote(referendumPublicId, voteYay);
  console.log(`Voted for active Referendum ID ${referendumPublicId}: ${voteYay ? 'yay' : 'nay'}`);

  // View Substrate Node logs until it says 'Super majority approval' as confirmation that
  // change to runtime code was successfully approved and deployed
  const e = await api.query.system.events((event) => {
    console.log('Event:', event)
  });
}

main().catch(console.error);
