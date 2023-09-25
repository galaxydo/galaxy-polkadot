import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { nanoid } from "nanoid";

type MacroFunction = (
  input: ExcalidrawElement,
) => Promise<ExcalidrawElement[]>;

// export class MacroRegistry {
//   registerMacro(name, fn) {
//     this.macros[name] = fn.bind(window.engine);
//   }
// }

// export class MacroEngine {
//   constructor ({ wallet, contracts, etc }) {
//     this.wallet = wallet;
//   }
// }

class GalaxyAPI {
  private macros: Record<string, MacroFunction>;
  private callbacks: Record<string, Function>;

  private galaxyContract: string;
  private galaxyMetadata: string;

  constructor() {
    this.macros = {};
    this.callbacks = {};
    this.log("Initialized.", "constructor");

    // Register default macros

    // todo: should read them locally or from remote repo
    this.registerMacro("js", this.defaultJsMacro);
    this.registerMacro("python", this.defaultPythonMacro);
    this.registerMacro("Deno", this.defaultDenoMacro);
    this.registerMacro("save", this.defaultSaveMacro);
    this.registerMacro("open", this.defaultOpenMacro);
    this.registerMacro("publish", this.defaultPublishMacro);

    this.galaxyContract = '5E1zfVZmokEX29W9xVzMYJAzvwnXWE7AVcP3d1rXzWhC4sxi';
    this.galaxyMetadata = 'https://raw.githubusercontent.com/7flash/galaxy-polkadot-contract/main/galaxy.json';
  }

  registerCallback(taskId: string, fn: (denoResult: { success: boolean, data: string }) => void): void {
    this.callbacks[taskId] = fn.bind(this);
  }

  executeCallback(taskId: string, denoResult: string): void {
    if (typeof this.callbacks[taskId] == 'function') {
      this.callbacks[taskId](denoResult);
    }
  }

  registerMacro(name: string, fn: MacroFunction): void {
    this.macros[name.toLowerCase()] = fn.bind(this);
    this.log(`Macro "${name}" registered.`, "registerMacro");
  }

  getMacro(name: string): MacroFunction | undefined {
    const macro = this.macros[name.toLowerCase()];
    this.log(`Getting macro: "${name}"`, "getMacro");
    return macro;
  }

  async executeMacro(
    name: string,
    input: ExcalidrawElement,
  ): Promise<ExcalidrawElement[]> {
    const macro = this.getMacro(name);
    this.log(`Executing macro "${name}" with input ${JSON.stringify(input)}.`, "executeMacro");

    if (!macro) {
      throw new Error(`Macro with name ${name} is not registered.`);
    }

    const result = await macro(input);
    this.log(`Execution result for "${name}": ${JSON.stringify(result)}`, "executeMacro");

    return result;
  }

  private defaultJsMacro(input: ExcalidrawElement): ExcalidrawElement[] {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultJsMacro");
    try {
      if (input.type !== "text") throw "not ok";
      const macroSource = input.text;

      const parsedFunction = Function(`return ${macroSource};`)();
      const functionName = parsedFunction.name || "Anonymous";

      this.registerMacro(functionName, parsedFunction);

      return `${functionName} registered at ${new Date().toTimeString()}`;
    } catch (error) {
      this.log(`Error: ${error}`, "defaultJsMacro");
      throw new Error("Error parsing function: " + error);
    }
  }

  private defaultDenoMacro(input: ExcalidrawElement): ExcalidrawElement[] {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultDenoMacro");
    try {
      if (input.type !== "text") throw "not ok";
      const macroSource = input.text;
      const regex = /function (\w+)\(/;
      const match = macroSource.match(regex);
      const functionName = (match && match[1]) || "AnonymousDeno";

      const wrappedFunction = async (inputElement) => {
        const response = await window.webui.call('executeDeno', JSON.stringify({
          code: `(${macroSource})`,
          input: inputElement
        }));
        this.log('response ' + response, 'w');
        if (response.success) {
          return response.data;
        } else {
          console.error('deno', response.error);
          return response.error;
        }
      };

      //   const wrappedFunction = new Function(`
      //   return async function(inputElement) {
      //     return window.webui.call('executeDeno', \`${macroSource.replace(/`/g, "\\`")}\`);
      //   }
      // `)();

      this.registerMacro(functionName, wrappedFunction);
      return `${functionName} registered at ${new Date().toTimeString()}`;
    } catch (error) {
      this.log(`Error: ${error}`, "defaultDenoMacro");
      throw new Error("Error parsing Deno function: " + error);
    }
  }

  private getPythonFunctionName(macroSource: string): string | null {
    const match = macroSource.match(/def (\w+)\(/);
    return match ? match[1] : null;
  }

  private augmentPythonCodeForExecution(macroSource: string): string {
    const functionName = this.getPythonFunctionName(macroSource);

    if (functionName && !macroSource.includes(`${functionName}(`)) {
      throw new Error(`The function ${functionName} is defined but not called in the macro source.`);
    }

    return functionName ? `${macroSource}\n\nprint(${functionName}())` : macroSource;
  }

  private createExecutionWrapper(macroSource: string): Function {
    const augmentedCode = this.augmentPythonCodeForExecution(macroSource);
    return new Function(`return async function(input) {
        return window.webui.call('executePython', \`${augmentedCode}\`);
    }`)();
  }

  private defaultPythonMacro(input: ExcalidrawElement): ExcalidrawElement {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultPythonMacro");

    if (input.type !== "text") {
      this.log(`Invalid input type: ${input.type}`, "defaultPythonMacro");
      throw new Error("Invalid input type for Python macro.");
    }

    const functionName = this.getPythonFunctionName(input.text);
    if (!functionName) {
      this.log(`Failed to extract function name: ${input.text}`, "defaultPythonMacro");
      throw new Error("Failed to extract function name from Python macro.");
    }

    const wrapperFunction = this.createExecutionWrapper(input.text);
    this.registerMacro(functionName, wrapperFunction);

    const text = `${functionName} defined at ${new Date().toTimeString()}`;
    return {
      type: "text",
      text: text,
      originalText: text,
    };
  }

  private async executeDeno(code: string, input?: ExcalidrawElement) {
    return new Promise(async (resolve, reject) => {
      const taskId = nanoid();
      this.registerCallback(taskId, (denoResult) => {
        if (denoResult.success) {
          return resolve(denoResult.data);
        } else {
          return reject(denoResult.error);
        }
      });
      window.webui.call('executeDeno', JSON.stringify({
        taskId,
        code,
        input: typeof input == 'object' ? input : {},
      }));
    });
  }

  async defaultSaveMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultSaveMacro");
    return new Promise(async (resolve, reject) => {
      try {
        let sceneName = ""; // Initial name

        // Handle the save to IPFS logic
        const handleSaveToIPFS = async () => {
          try {
            if (!sceneName) throw "Scene name not provided.";

            const frameId = input.id;

            const scene = {
              elements: window.ea.getSceneElements().filter(it => it.frameId == frameId),
              files: window.ea.getFiles(),
            }

            const escapedSceneName = sceneName.replace(/'/g, "\\'");
            const escapedSceneJSON = JSON.stringify(scene).replace(/'/g, "\\'");

            const denoScript = `
        async function saveScene(input) {
          const kvBlob = await import('https://deno.land/x/kv_toolbox/blob.ts');
  const kv = await Deno.openKv();
  const blob = new TextEncoder().encode('${escapedSceneJSON}');
  await kvBlob.set(kv, ["layers", '${escapedSceneName}'], blob);
  await kv.close();
  return blob.length;
        }
`;

            try {
              const result = await this.executeDeno(
                denoScript,
              );

              const updatedText = `${sceneName} (${result} bytes)`;
              // const updatedText = `Frame ${input.id} saved as "${sceneName}" at ${new Date().toTimeString()}`;
              return resolve(updatedText);
            } catch (err) {
              console.error(err);
              return reject("Error executing saveScene. " + err?.toString());
            }

            // const denoResult = await window.webui.call('saveScene', JSON.stringify({
            //   sceneName: escapedSceneName,
            //   sceneData: escapedSceneJSON,
            // }))

          } catch (error) {
            reject(`Error during saving: ${error}`);
          }
        };

        // Show modal to get the layer (scene) name
        await window.showModal({
          title: "Save scene",
          callback: handleSaveToIPFS,
          inputField: {
            value: sceneName,
            placeholder: "Scene Name",
            onChange: (e) => sceneName = e.target.value
          }
        });
      } catch (error) {
        this.log(`Error: ${error}`, "defaultSaveMacro");
        reject(`Error in defaultSaveMacro: ${error}`);
      }
    });
  }
  private async defaultPublishMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    const galaxyContractAddress = this.galaxyContract;

    return new Promise(async (resolve, reject) => {
      let layerName = '';
      const frameId = input.id;

      const handlePublishToGalaxy = async () => {
        try {
          if (!layerName) {
            throw "Layer name not provided.";
          }

          const scene = {
            elements: window.ea.getSceneElements().filter(it => it.frameId == frameId).map(it => {
              return {
                ...it,
                id: null,
              }
            }),
            files: window.ea.getFiles(),
          };

          const [error, ipfsLink] = await window.ipfs.upload(scene);

          if (error) {
            this.log('ipfs error' + error, 'handlePublish');
            throw new Error(error);
          }

          if (!window.contracts || !window.contracts.write) {
            throw new Error("Smart contract write function is not available.");
          }

          const args = [layerName, ipfsLink];
          this.log('args ' + args, 'handlePublish');

          if (!window.galaxyMetadata) {
            window.galaxyMetadata = await fetch(this.galaxyMetadata)
              .then(it => it.json());
          }

          const metadata = window.galaxyMetadata;

          this.log('metadata' + metadata, 'handlePublish');

          const { gasRequired, continueWithTransaction, caller } = await window.contracts.write({
            address: galaxyContractAddress,
            method: 'createLayer',
            args,
            metadata,
          });

          window.showModal({
            title: "Confirm Transaction",
            description: `Gas Cost: ${gasRequired}\nIPFS Link: ${ipfsLink}\nLayer Name: ${layerName}`,
            callback: async () => {
              await continueWithTransaction({
                onSuccess: (trxId) => {
                  window.showNotification({ message: `${trxId} transaction`, type: 'info' });
                  const galaxyLink = `galaxy://${caller}/${layerName}`;
                  window.showModal({
                    title: galaxyLink,
                    description: 'Transaction ID ' + trxId,
                  })
                  return resolve(galaxyLink);
                },
                onStatus: (status) => {
                  window.showNotification({ message: `${status} transaction`, type: 'info' });
                  window.showModal({
                    title: 'Transaction Status ' + status,
                  })
                },
              });
            }
          });
        } catch (error) {
          this.log(`Error during publishing: ${error}`, "defaultPublishMacro");
          reject(error);
        }
      };

      window.showModal({
        title: "Connect Wallet",
        description: `Click Confirm to invoke ${window.walletName} wallet extension`,
        callback: async () => {
          await window.connect();
          window.showModal({
            title: "Publish to Galaxy",
            message: "Please provide a layer name to publish to the Galaxy.",
            inputField: {
              label: "Layer Name",
              value: layerName,
              placeholder: "Enter Layer Name",
              onChange: (e) => {
                layerName = e.target.value;
              }
            },
            callback: handlePublishToGalaxy
          });
        }
      })
    });
  }

  private async defaultOpenMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultOpenMacro");

    const galaxyContract = this.galaxyContract;
    const galaxyMetadata = this.galaxyMetadata;

    return new Promise(async (resolve, reject) => {
      try {
        if (input.type !== "frame") {
          throw new Error("Invalid input for defaultOpenMacro. Expected a frame.");
        }

        let link = '';

        // Function to handle opening from Galaxy Link
        const handleOpenFromGalaxyLink = async () => {
          try {
            if (!link) throw "Galaxy link not provided.";

            this.log('! link 1 ' + link, 'open');

            let scene;

            if (link.startsWith('ipfs://') || link.startsWith('galaxy://')) {

              // Resolve galaxyLink to IPFS link
              if (link.startsWith('galaxy://')) {
                if (!window.galaxyMetadata) {
                  window.galaxyMetadata = await fetch(this.galaxyMetadata)
                    .then(it => it.json());
                }

                const metadata = window.galaxyMetadata;

                const [user, name] = link.replace('galaxy://', '').split('/');
                const result = await window.contracts.read({
                  address: galaxyContract,
                  method: 'resolveLink',
                  args: [user, name],
                  metadata,
                  options: {
                    defaultCaller: '5ERMmhn6tWtbSX6HspQcztkHbpaYKiZHfiouDBDXgSnMhxU6'
                  }
                });
                link = result.value.decoded.Ok
                this.log('! link 2', link);
              }
              scene =
                await window.ipfs.download(link);

              this.log('scene ' + scene, 'remote');

            } else {
              const denoScript = `
        async function openScene(input) {
          const kvBlob = await import('https://deno.land/x/kv_toolbox/blob.ts');

  const kv = await Deno.openKv();
  const layerBinary = await kvBlob.get(kv, ["layers", "${link}"]);
  await kv.close();
              
const layerStr = new TextDecoder().decode(layerBinary);

                return layerStr;
        }
`;

              try {
                scene = await this.executeDeno(
                  denoScript,
                );
                scene = JSON.parse(scene);
              } catch (err) {
                console.error(err);
                return reject("Error executing openScene. " + err?.toString());
              }
            }

            // Assuming `input` represents the user-defined frame.
            // `newElements` represent the elements with their own dimensions and coordinates.

            // Convert elements to Excalidraw compatible format
            const newElements = window.convertToExcalidrawElements(scene.elements);

            // Extracting the x, y coordinates from the user-defined frame
            const frameX = input.x;
            const frameY = input.y;

            // Find the bounding box of the newElements
            let minX = Math.min(...newElements.map(it => it.x));
            let minY = Math.min(...newElements.map(it => it.y));
            let maxX = Math.max(...newElements.map(it => it.x + it.width));
            let maxY = Math.max(...newElements.map(it => it.y + it.height));

            // Calculating the dimensions of the bounding box
            let elementsWidth = maxX - minX;
            let elementsHeight = maxY - minY;

            // Adjusting the frame width and height to accommodate the elements if necessary
            let frameWidth = Math.max(elementsWidth, input.width);
            let frameHeight = Math.max(elementsHeight, input.height);

            // Calculating the offsets to adjust the position of elements to the top-left of the frame
            let offsetX = frameX - minX;
            let offsetY = frameY - minY;

            // Creating new adjusted elements
            const adjustedElements = newElements.map(it => ({
              ...it,
              id: nanoid(),
              x: it.x + offsetX,
              y: it.y + offsetY,
            }));

            // Including the user-defined frame with potentially adjusted width and height
            const resultElements = [
              ...adjustedElements,
              {
                ...input,
                name: `${link}`,
                x: frameX,
                y: frameY,
                width: frameWidth,
                height: frameHeight
              }
            ];

            // If this is in a Promise, resolving it with resultElements
            resolve(resultElements);

            // Handle error as per your original script if necessary
          } catch (error) {
            this.log(`Error during opening: ${error}`, "defaultOpenMacro");
            reject(error); // Rejecting the promise in case of an error
          }
        };

        // If the galaxyLink is not present in the frame's customData, use the modal to get it

        await window.showModal({
          title: "Open from Galaxy",
          callback: handleOpenFromGalaxyLink,
          inputField: {
            value: link,
            placeholder: "Galaxy Link",
            onChange: (e) => link = e.target.value
          }
        });
      } catch (error) {
        this.log(`Error in defaultOpenMacro: ${error}`, "defaultOpenMacro");
        reject(error); // Rejecting the promise in case of an error
      }
    });
  }

  private log(message: string, method: string) {
    const formattedMessage = `[GalaxyAPI:: ${method}]- ${message}[${new Date().toISOString()}]`;
    console.log(formattedMessage);
  }
}

export default GalaxyAPI;
