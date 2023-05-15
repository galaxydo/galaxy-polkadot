import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

interface checkEnabledReturnType {
  accounts: InjectedAccountWithMeta[] | null;
  error: Error | null;
}

export const checkEnabled: (
  extensionName: string,
) => Promise<checkEnabledReturnType> = async (
  extensionName: string = "polkadot-extension",
) => {
  console.log("checkEnabled", extensionName);

  const extensionDapp = await import("@polkadot/extension-dapp");
  const { web3Accounts, web3Enable } = extensionDapp;
  try {
    const enabledApps = await web3Enable(extensionName);
    const w3Enabled = enabledApps.length > 0;
    let accounts = null;

    if (w3Enabled) {
      accounts = await web3Accounts();
      console.log('accounts', accounts);
      return { accounts, error: null };
    }

    return {
      accounts: null,
      error: new Error(
        "please allow your extension to access this dApp and refresh the page or install a substrate wallet",
      ),
    };
  } catch (error: any) {
    return { accounts: null, error };
  }
};

