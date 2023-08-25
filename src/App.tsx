window.EXCALIDRAW_ASSET_PATH = "/";

import { useRef, useEffect, useState, useMemo } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import GalaxyUI from "./GalaxyUI";
import GalaxyAPI from "./GalaxyAPI";
import { BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { ExcalidrawElement, ExcalidrawFrameElement, ExcalidrawTextElement, NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import throttle from "lodash.throttle";
import debounce from "lodash.debounce";

// import * as  transform from '../../../aug14/excalidraw/src/data/transform';

// import { convertToExcalidrawElements } from "@galaxydo/excalidraw-utils";

console.log('convertToExcalidrawElements', convertToExcalidrawElements);

type SelectedMacro = {
  param?: string;
  name: string;
  inputFrom: string;
  outputTo: string;
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

const POINTER_UPDATE_TIMEOUT = 333;

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

  useEffect(() => {
    console.log('window.excalidraw', excalidrawRef.current);

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
  const [selectedMacros, setSelectedMacros] = useState<Map<string, SelectedMacro[]>>();
  const [buffers, setBuffers] = useState<Map<string, SharedBuffer>>();

  const excalidrawComponent = useMemo(() => (
    <Excalidraw
      ref={excalidrawRef}
      zenModeEnabled={false}
      gridModeEnabled={false}
      theme="dark"
      onChange={(
        elements: ExcalidrawElement[],
        appState: AppState,
        files: BinaryFiles,
      ) => onPointerUpdate()}
    />
  ), [excalidrawRef]);
  const getArrowLabel = (arrow, elementMap) => {
    if (arrow.boundElements) {
      const labelElement = elementMap[arrow.boundElements[0].id];
      if (labelElement && labelElement.text.startsWith('=')) {
        return labelElement.text.substring(1);
      }
    }
    return null;
  }

  const onPointerUpdate = debounce(() => {
    console.log(new Date());

    const ea = excalidrawRef?.current;

    if (!ea) return;

    const elIds = ea.getAppState().selectedElementIds;
    if (!elIds) return;

    const selectedEls = ea.getSceneElements().filter(it => elIds[it.id] == true);
    const newSelectedMacros = new Map<string, SelectedMacro[]>();

    // Convert the array to a map for quicker lookups
    const elementMap = Object.fromEntries(ea.getSceneElements().map(e => [e.id, e]));

    for (const textElement of selectedEls) {
      if (textElement.type !== 'text' || !textElement.boundElements) continue;

      for (const boundEl of textElement.boundElements) {
        const arrow = elementMap[boundEl.id];

        if (arrow?.type === 'arrow' && arrow?.startBinding?.elementId === textElement.id) {
          const macroName = getArrowLabel(arrow, elementMap);
          if (macroName) {
            if (!newSelectedMacros.has(macroName)) newSelectedMacros.set(macroName, []);

            const macroDetails = {
              'name': macroName,
              'inputFrom': arrow.startBinding.elementId,
              'outputTo': arrow.endBinding?.elementId,
            };
            newSelectedMacros.get(macroName).push(macroDetails);
          }
        }
      }
    }

    setSelectedMacros(newSelectedMacros);

  }, POINTER_UPDATE_TIMEOUT);

  async function onMacrosInvoked(macroName: string) {
    const ea = excalidrawRef?.current;
    if (!ea) return;

    const m = selectedMacros?.get(macroName);
    if (!m) return;

    const updateOutputText = (outputEl, text: string) => {
      ea.updateScene({
        elements: ea.getSceneElements().map(it => {
          if (it.id === outputEl.id) {
            return {
              ...it,
              'originalText': text,
              'rawText': text,
              'text': text,
              'version': it.version + 1,
            };
          }
          return it;
        })
      });
    };

    for (const it of m) {
      const inputEl = ea.getSceneElements().find(jt => jt.id === it.inputFrom);
      const outputEl = ea.getSceneElements().find(jt => jt.id === it.outputTo);

      let outputText = 'empty';

      if (inputEl?.type === 'text') {
        try {
          const result = await window.ga.executeMacro(macroName, inputEl);

          if (typeof result === 'function') {
            // Handle the result if it's a function.
            // This depends on what you expect the function to do.
          } else if (typeof result === 'string') {
            outputText = result;
          } else if (typeof result === 'object') {
            if (result instanceof Array) {
              outputText = result[0].text;
            } else {
              outputText = result.text;
            }

          }
        } catch (err) {
          console.error(err);
          outputText = `Macro Failed: ${err}`;
        }
      }

      if (outputEl?.type === 'text') {
        updateOutputText(outputEl, outputText);
      }
    }
  }


  return (
    <div className="main">
      {excalidrawComponent}
      <GalaxyUI excalidrawRef={excalidrawRef} macros={selectedMacros} onMacrosInvoked={onMacrosInvoked} />
    </div>
  );
}
