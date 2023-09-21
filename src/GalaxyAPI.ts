import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

type MacroFunction = (
  input: ExcalidrawElement,
) => Promise<ExcalidrawElement[]>;

class GalaxyAPI {
  private macros: Record<string, MacroFunction>;

  constructor() {
    this.macros = {};
    this.log("Initialized.", "constructor");

    // Register default macros
    this.registerMacro("js", this.defaultJsMacro.bind(this));
    this.registerMacro("python", this.defaultPythonMacro.bind(this));
    this.registerMacro("Deno", this.defaultDenoMacro.bind(this));
    this.registerMacro("save", this.defaultSaveMacro.bind(this));
    this.registerMacro("open", this.defaultOpenMacro.bind(this));
    this.registerMacro("publish", this.defaultPublishMacro.bind(this));

  }

  registerMacro(name: string, fn: MacroFunction): void {
    this.macros[name.toLowerCase()] = fn;
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
        console.log('response', response);
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

  private async defaultSaveMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultSaveMacro");
    return new Promise(async (resolve, reject) => {
      try {
        let sceneName = ""; // Initial name

        // Handle the save to IPFS logic
        const handleSaveToIPFS = async () => {
          try {
            if (!sceneName) throw "Scene name not provided.";

            const denoScript = `
            Deno.KV.put('${sceneName}', '${JSON.stringify(input)}');
          `;

            const denoResult = await window.webui.executeDeno(denoScript);
            if (!denoResult.success) throw "Error executing Deno script.";

            // Create the updated element with the new text
            const updatedText = `Frame ${input.id} saved as "${sceneName}" at ${new Date().toTimeString()}`;
            return resolve(updatedText);
          } catch (error) {
            reject(`Error during saving: ${error}`);
          }
        };

        this.log('showModal', 'defaultSaveMacro');
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
    return new Promise(async (resolve, reject) => {
      try {
        let layerName = '';

        const handlePublishToGalaxy = async () => {
          try {
            if (!layerName) {
              throw "Layer name not provided.";
            }

            const ipfsLink = await window.ipfs.upload([input]);

            // Inline write to smart contract
            if (!window.contracts || !window.contracts.write) {
              throw new Error("Smart contract write function is not available.");
            }

            const args = [layerName, ipfsLink];
            const transactionId = await window.contracts.write({
              address: '0x1', // Replace with your contract address
              method: 'saveLayer', // Replace with your contract method
              args,
            });

            window.showNotification(`${transactionId} broadcasted`);

            const result = `${layerName} - ${ipfsLink}`;

            resolve(result);
          } catch (error) {
            this.log(`Error during publishing: ${error}`, "defaultPublishMacro");
            return reject(error);
          }
        };

        await window.showModal({
          title: "Publish to Galaxy",
          callback: handlePublishToGalaxy,
          inputField:
          {
            label: "Layer Name",
            value: layerName,
            placeholder: "Enter Layer Name",
            onChange: (e) => {
              console.log('! onChange', e.target.value);
              layerName = e.target.value;
            }
          },
          
        });
      } catch (error) {
        this.log(`Error in defaultPublishMacro: ${error}`, "defaultPublishMacro");
        reject(error);
      }
    });
  }



  private async defaultOpenMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultOpenMacro");

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

            // Resolve galaxyLink to IPFS link
            const ipfsLink = await this.resolveGalaxyLinkToIPFS(link);

            // Download content from IPFS
            const newElements = window.convertToExcalidrawElements(await this.downloadFromIPFS(ipfsLink));
            const x = Math.min(...newElements.map(it => it.x));
            const y = Math.min(...newElements.map(it => it.y));
            const width = Math.max(...newElements.map(it => it.x)) - x;
            const height = Math.max(...newElements.map(it => it.y)) - y;
            resolve([
              ...newElements,
              {
                ...input,
                name: `frame ${link}`,
                x, y, width, height
              }
            ]); // Resolving the promise here
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
  // This method will attempt to resolve the provided galaxyLink into its corresponding IPFS link.
  private async resolveGalaxyLinkToIPFS(galaxyLink: string): Promise<string> {
    // Use window.wallet.readContract to resolve the galaxyLink.
    // The specific parameters may need to be adjusted based on the exact contract and method names.
    return window.wallet.readContract('yourContractName', 'yourMethodName', galaxyLink);
  }

  // This method will attempt to download content from the provided IPFS link.
  private async downloadFromIPFS(ipfsLink: string): Promise<ExcalidrawElement[]> {
    const result = await window.ipfs.download(ipfsLink);
    return convertToExcalidrawElements(result.elements);
  }

  private log(message: string, method: string) {
    const formattedMessage = `[GalaxyAPI::${method}] - ${message} [${new Date().toISOString()}]`;
    console.log(formattedMessage);
  }
}

export default GalaxyAPI;
