import { AuthClient } from "@dfinity/auth-client";
import { useState } from "react";

let authClient: any = null;
// let account: any = null;

export default function useAuthClient() {
  const [account, setAccount] = useState(null);

  // const connect = async () => {
  //   if (!authClient) {
  //     authClient = await AuthClient.create();
  //     console.log('authClient', authClient);
  //     await new Promise((resolve, reject) => {
  //       authClient.login({
  //         identityProvider: 'https://identity.ic0.app',
  //         // identityProvider: `http://localhost:8000/?canisterId=${window.canisterId}`,
  //         onSuccess: resolve,
  //         onError: reject,
  //       })
  //     });
  //   }
  //   const identity = authClient.getIdentity();
  //   console.log('identity', identity);
  //   setAccount(identity);
  //   return account;
  // }

  const connect = async () => {

    // Canister Ids
    const canisterId = window.canisterId;

    // Whitelist
    const whitelist = [
      canisterId,
    ];

    // Make the request
    const isConnected = await window.ic.plug.requestConnect({
      whitelist,
      // 'host': 'http://localhost',
    });

    // Get the user principal id
    const principalId = await window.ic.plug.agent.getPrincipal();

    window.principalId = principalId;

    console.log(`Plug's user principal Id is ${principalId}`);

    setAccount(principalId);
    
    return principalId;
  }

  const disconnect = () => { }

  return {
    connect,
    disconnect,
    account,
  }
}
