import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { useEffect, useState } from 'react';
import { useIsMounted } from './use-is-mounted';

interface checkEnabledReturnType {
  accounts: InjectedAccountWithMeta[] | null;
  error: Error | null;
}

export const checkEnabled: (extensionName: string) => Promise<checkEnabledReturnType> = async (
  extensionName: string = 'polkadot-extension',
) => {
  const extensionDapp = await import('@polkadot/extension-dapp');
  const { web3Accounts, web3Enable } = extensionDapp;
  try {
    const enabledApps = await web3Enable(extensionName);
    const w3Enabled = enabledApps.length > 0;
    let accounts = null;

    if (w3Enabled) {
      accounts = await web3Accounts();
      return { accounts, error: null };
    }

    return {
      accounts: null,
      error: new Error('please allow your extension to access this dApp and refresh the page or install a substrate wallet')
    }
  } catch (error: any) {
    return { accounts: null, error };
  }
};

interface UsePolkadotExtensionReturnType {
  ready: boolean;
  accounts: InjectedAccountWithMeta[] | null;
  error: Error | null;
}

export const usePolkadotExtension = (): UsePolkadotExtensionReturnType => {
  const isMountedRef = useIsMounted();
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const enableExtension = async () => {
    const result = await checkEnabled("polkadot-extension");
    if (result.accounts) {
      setAccounts(result.accounts);
      return [null, result.accounts];
      console.log("Connected accounts:", result.accounts);
    } else {
      return [result.error, null];
    }
  };

  return { enableExtension, accounts, ready, error };
}