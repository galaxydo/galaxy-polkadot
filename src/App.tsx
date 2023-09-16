window.EXCALIDRAW_ASSET_PATH = "/";

import { useRef, useEffect, useState, useMemo } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import GalaxyUI from "./GalaxyUI";
import GalaxyAPI from "./GalaxyAPI";
import { BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { ExcalidrawElement, ExcalidrawFrameElement, ExcalidrawTextElement, NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import throttle from "lodash.throttle";
import debounce from "lodash.debounce";
import { ModalProvider } from './ModalDialog';

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

    for (const element of selectedEls) {
      // Check for arrows
      if (element.type === 'text' && element.boundElements) {
        for (const boundEl of element.boundElements) {
          const arrow = elementMap[boundEl.id];
          if (arrow?.type === 'arrow' && arrow?.startBinding?.elementId === element.id) {
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
      console.log('!', 'customData', JSON.stringify(element.customData));
      // Check for customData field with macros
      if (element.customData && element.customData.macros) {
        // Log the current element being processed
        console.log('Processing element:', element.id);

        for (const macroName in element.customData.macros) {
          console.log('!', 'macroName', macroName);

          // This condition seems redundant since we're already iterating through macroNames. Consider removing it.
          // if (!element.customData.macros[macroName]) continue;

          if (!newSelectedMacros.has(macroName)) newSelectedMacros.set(macroName, []);

          const macroDetails = {
            'name': macroName,
            'inputFrom': element.id,
            'outputTo': element.id, // Note: As mentioned, you might need to decide how to determine the output element.
          };

          console.log('!', 'macroDetails', JSON.stringify(macroDetails));
          newSelectedMacros.get(macroName).push(macroDetails);
        }
      }
    }

    console.log('!', 'newSelectedMacros', JSON.stringify([...newSelectedMacros]));

    setSelectedMacros(newSelectedMacros);

  }, POINTER_UPDATE_TIMEOUT);

  async function onMacrosInvoked(macroName: string) {
    const ea = excalidrawRef?.current;
    if (!ea) return;

    const m = selectedMacros?.get(macroName);
    if (!m) return;

    const updateOutputText = (outputEl, text: string) => {
      console.log('!', 'updateOutputText', outputEl.id, text);
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
      let outputEl = ea.getSceneElements().find(jt => jt.id === it.outputTo);
      if (!inputEl) throw 'no input element';
      console.log('!', 'outputEl', JSON.stringify(outputEl));
      if (!outputEl) throw 'no output element';

      try {
        let updatedEl = await window.ga.executeMacro(macroName, inputEl);
        if (typeof updatedEl == 'number') {
          updatedEl = `${updatedEl}`;
        }
        console.log('!', 'updatedEl', updatedEl)
        console.log('!', 'els-before', JSON.stringify(ea.getSceneElements().map(it => it.id)));
        ea.updateScene({
          elements: ea.getSceneElements().map(it => {
            if (it.id === outputEl.id) {
              console.log('!', 'update-from', JSON.stringify(it));
              if (updatedEl instanceof Array) {
                if (it.type == 'frame') {
                  // insert new elements into the frame
                  const newFrame = updatedEl.find(jt => jt.id == outputEl.id);
                  if (!newFrame) throw 'should return elements with frame';
                  it = [{
                    ...outputEl,
                    ...newFrame,
                  }, ...updatedEl.filter(jt => jt.id != newFrame.id).map(jt => ({
                    ...jt,
                    frameId: outputEl.id, // assign to frame
                  }))]
                }
              } else if (typeof updatedEl == 'object') {
                it = {
                  ...it,
                  ...updatedEl,
                  'version': it.version + 1,
                }
              } else if (typeof updatedEl == 'string') {
                if (it.type == 'frame') {
                  it = {
                    ...it,
                    name: updatedEl,
                    'version': it.version + 1,
                  }
                } else if (it.type == 'text') {
                  it = {
                    ...it,
                    text: updatedEl,
                    originalText: updatedEl,
                  }
                }
              }
              console.log('!', 'update-to', JSON.stringify(it));
            }

            return it;
          }).reduce((prev, curr) => {
            if (curr instanceof Array) {
              return [...prev, ...curr];
            }
            return [...prev, curr];
          }, [])
        })
        console.log('!', 'els-after', JSON.stringify(ea.getSceneElements().map(it => it.id)));
      } catch (err) {
        console.error('!', 'App', macroName, err.toString());
      }
    }
  }

  return (
    <div className="main">
      {excalidrawComponent}
      <ModalProvider>
        <GalaxyUI excalidrawRef={excalidrawRef} macros={selectedMacros} onMacrosInvoked={onMacrosInvoked} />
      </ModalProvider>
    </div>
  );
}
