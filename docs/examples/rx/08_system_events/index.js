const { switchMap } = require('rxjs/operators');

// Import the API
const { ApiRx } = require('@polkadot/api');

function main () {
  // Create our API with a default connection to the local node.
  ApiRx
    .create()
    .pipe(
      // Here we subscribe to any balance changes and update the on-screen value.
      // Use the Storage chain state (runtime) Node Interface.
      switchMap((api) => api.query.system.events())
    )
    // Subscribe to system events via storage
    .subscribe((events) => {
      console.log(`\nReceived ${events.length} events:`);

      // Loop through the Vec<EventRecord>
      events.forEach((record) => {
        // Extract the phase, event and the event types
        const { event, phase } = record;
        const types = event.typeDef;
  
        // Show what we are busy with
        console.log(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
        console.log(`\t\t${event.meta.documentation.toString()}`);
  
        // Loop through each of the parameters, displaying the type and data
        event.data.toArray().forEach((data, index) => {
          console.log(`\t\t\t${types[index].type}: ${data.toString()}`);
        });
      });
    });
}

main();
