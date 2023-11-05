

import { useRef, useEffect, useState, useMemo } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import GalaxyUI from "./GalaxyUI";
import GalaxyAPI from "./GalaxyAPI";
import { AppState, BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { ExcalidrawElement, ExcalidrawFrameElement, ExcalidrawTextElement, NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import throttle from "lodash.throttle";
import debounce from "lodash.debounce";
import { ModalProvider } from './ModalDialog';
import { UseInkProvider } from 'useink';
import { RococoContractsTestnet, ShibuyaTestnet } from 'useink/chains';
import { NotificationContext, NotificationProvider } from './NotificationContext';  // Import NotificationContext
// import * as  transform from '../../../aug14/excalidraw/src/data/transform';

// import { convertToExcalidrawElements } from "@galaxydo/excalidraw-utils";

import { InternetIdentityProvider } from "@internet-identity-labs/react-ic-ii-auth"
import { AuthButton } from "./AuthButton"



console.log('convertToExcalidrawElements', convertToExcalidrawElements);

type SelectedMacro = {
  param?: string;
  name: string;
  inputFrom: string;
  outputTo: string;
  arrow: string;
  hotkey?: string;
};

type Macro = {
  name: string;
  source: string;
  updatedAt: Date;
};

type SharedBuffer = {
  name: string;
  value: string;
  updatedAt: Date;
};

import type { LayerData } from '../../handlers/types';
import usePointerUpdate from "./hooks/usePointerUpdate";
import useMacrosInvoked from "./hooks/useMacrosInvoked";



declare global {
  interface Window {
    macros: Map<string, Function>,
    ga: {
      loadLayer: Function,
      executeMacro: Function,
    },
    ea: ExcalidrawImperativeAPI;
    webui: {
      getLayer: Function,
    };
    convertToExcalidrawElements: Function;
  }
}

const assert = (cond, msg = 'failed') => {
  if (!cond) throw `${msg}`
}

export default function App() {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);

  const useInkConfig = {
    dappName: 'Galaxy',
    chains: [RococoContractsTestnet]
  };

  useEffect(() => {
    console.log('window.excalidraw', excalidrawRef.current);

    if (window.injectedWeb3 && typeof window.injectedWeb3 === 'object') {
      window.walletName = Object.keys(window.injectedWeb3)[0];
    } else {
      console.warn('window.injectedWeb3 is not defined or not an object');
    }

    if (excalidrawRef.current) {
      const ea = excalidrawRef.current!;

      window.convertToExcalidrawElements = convertToExcalidrawElements;

      window.ea = ea;

      if (!window.ga) {
        window.ga = new GalaxyAPI();
      }

      /*
      window.cb = (layers) => {
        const ea = window.excalidraw.current;
        ea?.updateScene({
          elements: {
            ...ea.getSceneElements(),
            ...layers.map(it => ({
              type: 'frame',
              width: it.w,
              height: it.w,
              x: it.x,
              y: it.y,
              name: it.layerName,
            }))
          }
        });
        // also add a text element with summary of frames and center on it
      }
      */

      //window.webui.call('load_layers');

    }
  }, [excalidrawRef.current])

  const [macros, setMacros] = useState<Map<string, Macro>>();

  const [buffers, setBuffers] = useState<Map<string, SharedBuffer>>();

  const { onPointerUpdate, selectedMacros } = usePointerUpdate();

  const excalidrawComponent = useMemo(() => (
    <Excalidraw
      ref={excalidrawRef}
      zenModeEnabled={false}
      gridModeEnabled={false}
      viewModeEnabled={false}
      theme="dark"
      onChange={onPointerUpdate}
      validateEmbeddable={true}
    />
  ), [excalidrawRef]);


  const selectedMacrosRef = useRef(selectedMacros);

  const { onMacrosInvoked } = useMacrosInvoked(excalidrawRef, selectedMacros);

  return (
    <div className="main">
      <NotificationProvider>
        {excalidrawComponent}
        <ModalProvider>
          <GalaxyUI excalidrawRef={excalidrawRef} macros={selectedMacros} onMacrosInvoked={onMacrosInvoked} />
        </ModalProvider>
      </NotificationProvider>
    </div>
  );
}
