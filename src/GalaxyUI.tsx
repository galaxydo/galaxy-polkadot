import React, { useEffect, useState, useContext } from 'react';
import { usePolkadotExtension } from "./hooks/use-polkadot-extension";
import { useIPFSClient } from './hooks/use-ipfs-client';
import styles from './GalaxyUI.module.css';
import AddIcon from './assets/add-icon.svg';
import GetIcon from './assets/get-icon.svg';
import WalletIcon from './assets/wallet-icon.svg';
import InfoIcon from './assets/info-icon.svg';
import { ModalContext } from './ModalDialog';

const Dialogs = {
  GetScene: 'GetScene',
  SaveScene: 'SaveScene',
  Info: 'Info',
  ConnectWallet: 'ConnectWallet',
};

const GalaxyUI = ({ excalidrawRef, macros, onMacrosInvoked }) => {
  console.log('GalaxyUI', macros);
  const { showModal, closeModal } = useContext(ModalContext);

  const { accounts, enableExtension } = usePolkadotExtension();
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

  useEffect(() => {
    window.showModal = showModal;

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
  const handleFKeyClick = async (fKey) => {
    setLoadingMacro(fKey);
    setSelectedFKey(fKey);
    await onMacrosInvoked(fKey); // If onMacrosInvoked is async
    setLoadingMacro(null);
  };

  const openDialog = (dialog) => {
    setCurrentDialog(dialog);
  };

  const closeDialog = () => {
    setCurrentDialog(null);
  };

  const showNotification = (message) => {
    setNotifications((prevNotifications) => [...prevNotifications, message]);
    setTimeout(() => {
      setNotifications((prevNotifications) => prevNotifications.slice(1));
    }, 5000);
  };

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

  const handleConnectWallet = async () => {
    showNotification("Connecting wallet...");
    const [error, accounts] = await enableExtension();

    if (accounts && accounts[0]) {
      const walletName = accounts[0].meta ? accounts[0].meta.name : accounts[0].address;
      showNotification("Wallet connected: " + walletName);
    } else {
      showError("Connection failed: " + error);
    }
    closeDialog();
  }

  const handleLoadFromIPFS = async () => {
    if (sceneHash) {
      try {
        await loadScene(sceneHash);
        showNotification("Scene loaded successfully");
        excalidrawRef.current.scrollToContent();
        closeDialog();
      } catch (error) {
        console.log('error', error);
        showError("Error loading scene: " + error);
      }
    }
  };

  const handleSaveToIPFS = async () => {
    if (excalidrawRef.current && sceneName) {
      const files = excalidrawRef.current.getFiles();
      const scene = JSON.stringify({
        elements: excalidrawRef.current.getSceneElements(),
        files: Object.keys(files).map(it => files[it]),
        source: accounts[0].address,
        appState: {
          name: sceneName,
        }
      });
      const [error, hash] = await saveScene(scene);
      if (hash) {
        setSceneHash(hash);
        window.history.pushState(null, null, `#${hash}`);
        excalidrawRef.current.updateScene({
          appState: {
            name: sceneName,
          }
        })
        showNotification(`Scene saved at ipfs://${hash}`);
      } else {
        showError(`Error saving scene: ${error}`)
      }
      closeDialog();
    } else {
      showError("Cannot save scene");
    }
  }

  return (<div>
    <div className={styles.topLeft}>
      <button data-test="addButton" className={styles.customButton} onClick={() => {
        showModal({
          title: "Save scene",
          callback: handleSaveToIPFS,
          inputField: {
            value: sceneName,
            placeholder: "Scene Name",
            onChange: (e) => setSceneName(e.target.value)
          }
        });
      }}>
        <img src={AddIcon} alt="Add" />
      </button>
      <button data-test="loadButton" className={styles.customButton} onClick={() => {
        showModal({
          title: "Load scene",
          callback: handleLoadFromIPFS,
          inputField: {
            value: sceneHash,
            placeholder: "Scene Hash",
            onChange: (e) => setSceneHash(e.target.value)
          }
        });
      }}>
        <img src={GetIcon} alt="Get" />
      </button>
    </div>


    <div className={styles.topRight}>
      {accounts && (
        <button data-test="infoButton" className={styles.customButton} onClick={() => {
          const formatInfoDescription = () => {
            let infoString = "";

            if (accounts && accounts[0]) {
              infoString += `Connected Wallet: ${accounts[0].meta?.name} - ${accounts[0]?.address}\n`;
            }

            if (sceneHash) {
              infoString += `Scene Hash: ${sceneHash}\n`;
            }

            if (data && data.name) {
              infoString += `Scene Name: ${data.name}\n`;
            }

            if (data && data.source) {
              infoString += `Scene Author: ${data.source}\n`;
            }

            return infoString;
          };

          showModal({
            title: "Scene Details",
            description: formatInfoDescription(),
            callback: () => { }  // If there's any logic to execute on Info confirmation
          });
        }}>
          <img src={InfoIcon} alt="Info" />
        </button>
      )}
      {!accounts && (
        <button data-test="walletButton" className={styles.customButton} onClick={() => {
          showModal({
            title: "Connect Wallet",
            description: "Please connect your Polkadot wallet to save and share scenes.",
            callback: handleConnectWallet
          });
        }}>
          <img src={WalletIcon} alt="Wallet" />
        </button>
      )}
    </div>

    {currentDialog === Dialogs.Info && (
      <div data-test="infoDialog" className={styles.dialogCentered}>
        <h3>Scene Details</h3>
        <div className={styles.dialogContent}>
          {
            accounts && accounts[0] && <>
              <p>Connected Wallet:</p>
              <p>{accounts[0].meta?.name} - {accounts[0]?.address}</p>
            </>
          }
          {sceneHash && <>
            <p>Scene Hash:</p>
            <p data-test="ipfsHash">{sceneHash}</p>
          </>}
          {
            data && data.name && (
              <>
                <p>Scene Name:</p>
                <p>{data.name}</p>
              </>
            )
          }
          {data && data.source && (
            <>
              <p>Scene Author:</p>
              <p>{data.source}</p>
            </>
          )}
          <button data-test="closeButton" className={styles.customButton} onClick={closeDialog}>
            Close
          </button>
        </div>
      </div>
    )}

    <div
      className={styles.bottomRight}
    >
      {notifications.map((notification, index) => (
        <div
          key={index}
          className={styles.notification}
        >
          {notification}
        </div>
      ))}
      {errors.map((error, index) => (
        <div
          key={index}
          className={styles.error}
        >
          {error}
        </div>
      ))}
    </div>

    <div className={styles.bottomCenter}>
      {macros && Array.from(macros.entries()).map(([macroName, macroList]) => {
        return (
          <button
            data-testid={`macro-button-${macroName}`}
            key={macroName}
            className={selectedFKey === macroName ? styles.selectedFKeyButton : styles.fKeyButton}
            onClick={() => handleFKeyClick(macroName)}
            title={`Hotkey: ${macroList[0].hotkey}`} // Assuming the hotkey is the same for all macros in the list
          >
            <div className={styles.macroName}>{macroName}</div>
            {loadingMacro === macroName ? (
              <div data-testid={`loading-indicator-${macroName}`} className={styles.loadingIndicator}></div>
            ) : (
              <div className={styles.selectionBadge}>{`x${macroList.length}`}</div>
            )}
          </button>
        );
      })}
    </div>
  </div>
  );
};

export default GalaxyUI;
