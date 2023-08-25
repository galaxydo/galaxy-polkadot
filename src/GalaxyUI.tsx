import React, { useEffect, useState } from 'react';
import { usePolkadotExtension } from "./hooks/use-polkadot-extension";
import { useIPFSClient } from './hooks/use-ipfs-client';
import styles from './GalaxyUI.module.css';
import AddIcon from './assets/add-icon.svg';
import GetIcon from './assets/get-icon.svg';
import WalletIcon from './assets/wallet-icon.svg';
import InfoIcon from './assets/info-icon.svg';

const Dialogs = {
  GetScene: 'GetScene',
  SaveScene: 'SaveScene',
  Info: 'Info',
  ConnectWallet: 'ConnectWallet',
};

const GalaxyUI = ({ excalidrawRef, macros, onMacrosInvoked }) => {
  console.log('GalaxyUI', macros);

  const { accounts, enableExtension } = usePolkadotExtension();
  const { data, loadScene, saveScene } = useIPFSClient();

  const [currentDialog, setCurrentDialog] = useState(null);
  const [sceneHash, setSceneHash] = useState("");
  const [sceneName, setSceneName] = useState("");
  const [sceneCreator, setSceneCreator] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [errors, setErrors] = useState([]);

  // State to track the selected F key
  const [selectedFKey, setSelectedFKey] = useState('');

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
  const handleFKeyClick = (fKey) => {
    setSelectedFKey(fKey);
    onMacrosInvoked(fKey);
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
        if (accounts && accounts[0]) {
          openDialog(Dialogs.SaveScene);
        } else {
          showError(`Required Polkadot Wallet`)
          openDialog(Dialogs.ConnectWallet);
        }
      }}>
        <img src={AddIcon} alt="Add" />
      </button>
      <button data-test="loadButton" className={styles.customButton} onClick={() => openDialog(Dialogs.GetScene)}>
        <img src={GetIcon} alt="Get" />
      </button>
    </div>


    <div className={styles.topRight}>
      {accounts && (
        <button data-test="infoButton" className={styles.customButton} onClick={() => openDialog(Dialogs.Info)}>
          <img src={InfoIcon} alt="Info" />
        </button>
      )}
      {!accounts && (
        <button data-test="walletButton" className={styles.customButton} onClick={() => openDialog(Dialogs.ConnectWallet)}>
          <img src={WalletIcon} alt="Wallet" />
        </button>
      )}
    </div>

    {currentDialog === Dialogs.SaveScene && (
      <div data-test="saveDialog" className={styles.dialogCentered}>
        <h3>Save scene</h3>
        <div className={styles.dialogContent}>
          <label>
            <input
              type="text"
              value={sceneName}
              placeholder="Scene Name"
              onChange={(e) => setSceneName(e.target.value)}
            />
          </label>
          <button data-test="saveButton" className={styles.customButton} onClick={handleSaveToIPFS}>
            Save to IPFS
          </button>
          <button data-test="closeButton" className={styles.customButton} onClick={closeDialog}>
            Cancel
          </button>

        </div>
      </div>
    )}

    {currentDialog === Dialogs.GetScene && (
      <div data-test="loadDialog" className={styles.dialogCentered}>
        <h3>Load scene</h3>
        <div className={styles.dialogContent}>
          <label>
            <input
              type="text"
              placeholder="Scene Hash"
              value={sceneHash}
              onChange={(e) => setSceneHash(e.target.value)}
            />
          </label>
          <button data-test="getSceneButton" className={styles.customButton} onClick={handleLoadFromIPFS}>
            Load from IPFS
          </button>
          <button data-test="cancelButton" className={styles.customButton} onClick={closeDialog}>
            Cancel
          </button>
        </div>
      </div>
    )}

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

    {currentDialog === Dialogs.ConnectWallet && (
      <div data-test="connectDialog" className={styles.dialogCentered}>
        <h3>Connect Wallet</h3>
        <div className={styles.dialogContent}>
          <p>Please connect your Polkadot wallet to save and share scenes.</p>
          <button data-test="connectButton" className={styles.customButton} onClick={handleConnectWallet}>
            Connect Wallet
          </button>
          <button data-test="cancelButton" className={styles.customButton} onClick={closeDialog}>
            Cancel
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
            <div className={styles.selectionBadge}>{`x${macroList.length}`}</div>
          </button>
        );
      })}
    </div>
  </div>
  );
};

export default GalaxyUI;
