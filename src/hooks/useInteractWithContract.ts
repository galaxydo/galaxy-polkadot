import { useCallback, useEffect, useRef, useState } from 'react';
import { Abi, ContractPromise, ContractSubmittableResult, toContractAbiMessage } from 'useink/core';
import { useApi, useChain, useWallet } from 'useink';
import { ChainContract, useDefaultCaller } from 'useink';
import { useAbiMessage } from 'useink';
import { call } from 'useink/core';
import { toContractOptions } from 'useink/core';

function useInteractWithContract() {
  const { account, connect } = useWallet();
  const chainConfig = useChain('rococo-contracts-testnet');
  // console.log('chainConfig', chainConfig);
  const { api } = useApi(chainConfig?.id) || {};

  console.log('Initializing useInteractWithContract...a', api);

  const apiRef = useRef(api);
  apiRef.current = api;

  const accountRef = useRef(account);
  accountRef.current = account;

  useEffect(() => {
    console.log("API changed:", api, apiRef.current);
  }, [api]);

  const getAbi = useCallback((metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      throw new Error('Metadata is empty or invalid.');
    }
    console.log('getAbi', 'api', apiRef.current);
    const props =
      apiRef.current?.registry.getChainProperties();
    console.log('getAbi', 'props', props);
    const abi = new Abi(metadata, props);

    if (!abi) {
      throw new Error('Failed to fetch ABI.');
    }

    return abi;
  }, [api]);

  const getAbiMessage = (contract, message) => {
    if (!contract) return;
    const abiMessage = toContractAbiMessage(contract, message);

    if (!abiMessage || !abiMessage.ok) {
      throw new Error(`Failed to retrieve ABI message for method: ${message}.`);
    }

    return abiMessage.value;
  };

  const getChainContract = useCallback((abi, address) => {
    console.log(`Fetching contract for ABI: ${abi} and address: ${address}`);
    if (apiRef.current && abi) {
      return new ContractPromise(apiRef.current, abi, address);
    }
    return null;
  }, [api]);

  const read = useCallback(async ({ address, metadata, method, args = [], options }) => {
    console.log(`Reading data using method: ${method} from address: ${address} with args:`, args);
    if (!apiRef.current) {
        console.warn('API is not connected. Attempting to connect...');
        await window.connect();
    }
    const abi = getAbi(metadata);
    const chainContract = getChainContract(abi, address);
    const abiMessage = getAbiMessage(chainContract, method);

    const caller = account?.address
      ? account.address
      : options?.defaultCaller
        ? options.defaultCaller
        : undefined;

    if (!abiMessage || !chainContract || !caller) {
      console.error('Invalid arguments or setup 1');
      throw new Error('Invalid arguments or setup 2');
    }

    try {
      const callResult = await call(
        chainContract,
        abiMessage,
        caller,
        args,
        options,
      );

      console.log('Read result:', callResult);
      return callResult;

    } catch (error) {
      console.error(`Error reading from contract: ${error.message}`);
      throw new Error(`Error reading from contract: ${error.message}`);
    }

  }, [account]);

  const write = useCallback(async ({ address, metadata, method, args, options, chainId }) => {
    console.log(`Writing data using method: ${method} to address: ${address} with args:`, args);

    const abi = getAbi(metadata);
    const chainContract = getChainContract(abi, address);
    const abiMessage = getAbiMessage(chainContract, method);

    console.log('! chainContract', chainContract, chainContract.contract);
    console.log('! account', account, accountRef.current);

    if (!chainContract || !accountRef.current || !accountRef.current.wallet?.extension) {
      // connect(window.walletName);
      throw new Error('Contract or wallet information missing.');
    }

    const caller = accountRef.current.address
      ? accountRef.current.address
      : null;
    
    if (!caller || !chainContract || !abiMessage) {
      throw new Error('Dry run prerequisites not met.');
    }

    let dryRunResult;
    try {
      dryRunResult = await call(
        chainContract,
        abiMessage,
        caller,
        args,
        options
      );
    } catch (error) {
      console.error(`Dry run error: ${error.message}`);
      throw new Error('Dry run failed.');
    }

    if (dryRunResult && dryRunResult.ok) {
      const { gasRequired } = dryRunResult.value;

      const continueWithTransaction = async ({ onSuccess, onStatus }) => {
        const tx = chainContract.tx[method];
        if (!tx) {
          throw new Error(`'${method}' not found on contract instance`);
        }

        try {
          const txResult = await tx(
            { gasLimit: gasRequired, ...toContractOptions(options) },
            ...args
          ).signAndSend(
            accountRef.current.address,
            { signer: accountRef.current.wallet.extension.signer },
            (txResult: ContractSubmittableResult) => {
              if (txResult && txResult.status && txResult.status.isFinalized) {
                const txID = txResult.status.asFinalized.toString();
                console.log(`Transaction ID: ${txID}`);
                if (typeof onSuccess == 'function') {
                  onSuccess(txID);
                }
              } else {
                console.log('Transaction status', txResult.status.type);
                if (typeof onStatus == 'function') {
                  onStatus(txResult.status.type);
                }
              }
            },
          );

          console.log('! maybe txResult', txResult);

          return txResult;

        } catch (error) {
          console.error(`Error executing transaction: ${error.message}`);
          throw new Error(`Error executing transaction: ${error.message}`);
        }
      };

      return { gasRequired, continueWithTransaction, caller };
    } else {
      throw new Error('Dry run failed.');
    }

  }, [account]);

  return { read, write };
}

export default useInteractWithContract;
