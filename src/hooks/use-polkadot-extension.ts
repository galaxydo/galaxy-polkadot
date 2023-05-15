import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { useIsMounted } from "./use-is-mounted";
import { checkEnabled } from "../utils.ts";

interface UsePolkadotExtensionReturnType {
  ready: boolean;
  accounts: InjectedAccountWithMeta[] | null;
  error: Error | null;
  enableExtension: Function;
}

export const usePolkadotExtension = (): UsePolkadotExtensionReturnType => {
  const isMountedRef = useIsMounted();
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[] | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  const enableExtension = async () => {   
    const result = await checkEnabled("polkadot-extension");
    console.log('result', result);
    if (result.accounts && result.accounts.length > 0) {
      setAccounts(result.accounts);
      console.log("Connected accounts:", result.accounts);
      return [null, result.accounts];
    } else {
      return [result.error, null];
    }
  };

  return { enableExtension, accounts, ready, error };
};
