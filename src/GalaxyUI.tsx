import React, { useEffect, useState, useContext } from 'react';
import { useIPFSClient } from './hooks/use-ipfs-client';
import styles from './GalaxyUI.module.css';
import AddIcon from './assets/add-icon.svg';
import GetIcon from './assets/get-icon.svg';
import WalletIcon from './assets/wallet-icon.svg';
import InfoIcon from './assets/info-icon.svg';
import { ModalContext } from './ModalDialog';
import useWallet from './hooks/useWallet';
// import { useWallet, useAllWallets, useChain } from 'useink';  // Import the required hooks
import { NotificationContext, NotificationProvider } from './NotificationContext';  // Import NotificationContext
import { useTx, useContract } from 'useink';
import { pickDecoded, shouldDisable } from 'useink/utils';
import metadata from './metadata.json';

import { Abi, ContractPromise } from 'useink/core';
import { useApi } from 'useink';
import { ChainId } from 'useink/chains';
import useInteractWithContract from './hooks/useInteractWithContract';
import { InternetIdentityProvider } from '@internet-identity-labs/react-ic-ii-auth';
import { AuthButton } from './AuthButton';

const Dialogs = {
  GetScene: 'GetScene',
  SaveScene: 'SaveScene',
  Info: 'Info',
  ConnectWallet: 'ConnectWallet',
};

const GalaxyUI = ({ excalidrawRef, macros, onMacrosInvoked }) => {
  // console.log('GalaxyUI', macros);
  const { showModal, closeModal } = useContext(ModalContext);
  const { showNotification } = useContext(NotificationContext);  // Use NotificationContext

  // const { accounts, enableExtension } = usePolkadotExtension();
  const { data, loadScene, saveScene } = useIPFSClient();

  const [currentDialog, setCurrentDialog] = useState(null);
  const [sceneHash, setSceneHash] = useState("");
  const [sceneName, setSceneName] = useState("");
  const [sceneCreator, setSceneCreator] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loadingMacro, setLoadingMacro] = useState(null);

  // State to track the selected F key
  const [selectedFKey, setSelectedFKey] = useState('');

  const { account, connect, disconnect } = useWallet();
  // const wallets = useAllWallets();

  // const chainConfig = useChain();

  const { read, write } = useInteractWithContract();

  // const [isConnected, setConnected] = useState(!!account?.address);

  useEffect(() => {
    window.account = account;
  }, [account]);

  useEffect(() => {
    window.canisterId = 'bkyz2-fmaaa-aaaaa-qaaaq-cai';

    window.showModal = showModal;

    // window.wallets = wallets;
    // window.connect = async () => {
    //   return connect(window.walletName);
    // };

    window.showNotification = showNotification;

    window.ipfs = {
      upload: saveScene,
      download: loadScene,
    }

    window.contracts = {
      read: read,
      write: write,
    }

    return () => {
      window.showModal = null;
    }

  }, []);


  /*
    const macros = new Map([
      ['Macro1', [
        { name: 'Macro1_1', hotkey: 'F1' },
        { name: 'Macro1_2', hotkey: 'F2' },
      ]],
      ['Macro2', [
        { name: 'Macro2_1', hotkey: 'F3' },
      ]],
      // ... Define more macros here
    ]);
  */
  // Function to handle F key button click
  const handleFKeyClick = async (fKey, benxit) => {
    setLoadingMacro(fKey);
    setSelectedFKey(fKey);
    await onMacrosInvoked(fKey, benxit); // If onMacrosInvoked is async
    setLoadingMacro(null);
  };

  const openDialog = (dialog) => {
    setCurrentDialog(dialog);
  };

  const closeDialog = () => {
    setCurrentDialog(null);
  };
  /*
    const showNotification = (message) => {
      setNotifications((prevNotifications) => [...prevNotifications, message]);
      setTimeout(() => {
        setNotifications((prevNotifications) => prevNotifications.slice(1));
      }, 5000);
    };
  */
  const showError = (message) => {
    setErrors((prevErrors) => [...prevErrors, message]);
    setTimeout(() => {
      setErrors((prevErrors) => prevErrors.slice(1));
    }, 5000);
  };

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    showNotification(window.location.href);
    if (hash) {
      showNotification("Loading scene from IPFS... " + hash);
      loadScene(hash).then(() => {
        showNotification("Scene loaded " + hash);
        excalidrawRef.current.scrollToContent();
      }).catch(error => {
        showError("Error loading scene: " + error);
      })
    }
  }, []);

  useEffect(() => {
    if (data && excalidrawRef.current) {
      try {
        if (data?.appState?.name) {
          excalidrawRef.current.updateScene({
            appState: {
              name: data.appState.name,
            }
          })
        }
        excalidrawRef.current.updateScene({
          elements: data.elements,
        });
        if (data.files) {
          excalidrawRef.current.addFiles(
            data.files
          );
        }
      } catch (err) {
        showError(`Invalid scene: ${err}`)
      }
    }
  }, [data]);

  const macroTitles = {
    'jump': 'Click to jump into chosen anchor',
  }

  const makeButton = (macroName, macroCaption, macroLen) => {
    return <button
      data-testid={`macro-button-${macroName}`}
      key={macroName}
      className={selectedFKey === macroName ? styles.selectedFKeyButton : styles.fKeyButton}
      onClick={() => handleFKeyClick(macroName, macroCaption)}
      // title={`Hotkey: ${macroList[0].hotkey}`}
      title={`${macroTitles[macroName] ?? 'Click to execute macro'}`}
    >
      <div className={styles.macroName}>{macroCaption}</div>
      {loadingMacro === macroName ? (
        <div data-testid={`loading-indicator-${macroName}`} className={styles.loadingIndicator}></div>
      ) : (
        <div className={styles.selectionBadge}>{`x${macroLen}`}</div>
      )}
    </button>
  }

  return (<div>
    <div className={styles.topLeft}>
    </div>

    <div className={styles.topRight}>
      <InternetIdentityProvider
        authClientOptions={
          {
            maxTimeToLive: BigInt(Date.now() + 7 * 24 * 60 * 60 * 1e9),
            identityProvider: "https://nfid.one/authenticate/?applicationName=Galaxy-Browser",
            windowOpenerFeatures:
              `left=${window.screen.width / 2 - 525 / 2}, ` +
              `top=${window.screen.height / 2 - 705 / 2},` +
              `toolbar=0,location=0,menubar=0,width=525,height=705`,
            onSuccess: (principal) => {
              alert("Principal " + JSON.stringify(principal));
              // setProvider("NFID")
            },
          }
        }
      >
        <AuthButton reset={() => setProvider(null)} provider="NFID" />
      </InternetIdentityProvider>    </div>

    <div className={styles.bottomCenter}>
      {macros && Array.from(macros.entries()).map(([macroName, macroList]) => {
        if (macroName == 'jump') {
          const buttons = [];
          for (const it of macroList) {
            buttons.push(
              makeButton(macroName, it.caption, 1)
            );
          }
          return (
            <>
              {...buttons}
            </>
          )
        } else {
          return (
            makeButton(macroName, macroName, macroList.length)
          );
        }
      })}
    </div>
  </div>
  );
};

export default GalaxyUI;
