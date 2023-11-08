import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { nanoid } from "nanoid";
import { NotificationProvider } from "./NotificationContext";

type MacroFunction = (
  input: ExcalidrawElement,
  output: ExcalidrawElement,
) => Promise<ExcalidrawElement[] | string>;

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
    this.registerMacro("complete", this.defaultGpt4Macro);
    this.registerMacro("fetch", this.defaultFetchMacro);
    this.registerMacro("cat", this.defaultCatMacro);
    this.registerMacro("ls", this.defaultLsMacro);
    // this.registerMacro("gpt3", this.defaultGpt3Macro);
    // this.registerMacro("draw", this.defaultSdMacro);

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
    output: ExcalidrawElement,
  ): Promise<ExcalidrawElement[]> {
    const macro = this.getMacro(name);
    this.log(`Executing macro "${name}" with input ${JSON.stringify(input)}`, "executeMacro");

    if (!macro) {
      throw new Error(`Macro with name ${name} is not registered.`);
    }

    const result = await macro(input, output);
    this.log(`Execution result for "${name}": ${JSON.stringify(result)}`, "executeMacro");

    return result;
  }

  private constructGptScript(model: string, key: string): string {
    // note, input and argument are magically embedded in runtime
    return `
async function ai() {
    const inputText = input.text;
    const taskText = argument;

    const { OpenAI } = await import("https://deno.land/x/openai/mod.ts");
    const openAI = new OpenAI('${key}');

    let opts = { model: '', messages: [] };
    opts.model = '${model}';
    opts.messages.push({ 'role': 'system', 'content': 'Execute given task over given input, respond with short result only, no comments.'});
    opts.messages.push({ 'role': 'user', 'content': 'Input: ' + inputText });
    opts.messages.push({ 'role': 'user', 'content': 'Task: ' + taskText });
    const completion = await openAI.createChatCompletion(opts);

    return completion.choices[0].message.content;
}
    `;
  }


  private async defaultCatMacro(input: ExcalidrawElement, output: ExcalidrawElement) {
    try {
      const bit = this.getFullTree(input, output);
      const cit = bit.join('').replace('~/Documents/', '/').replace('~/', '').replace(/\/\//g, '/');
      const rit = await fetch(`http://localhost:8080${cit}`)
        .then(it => it.text());
      // const xit = ea.getSceneElements().find(it => {
      //   const zit = input.groupIds.filter(azit => it.groupIds.includes(azit)).length;
      //   if (it.type == 'text' && zit) {
      //     return true;
      //   }
      // })
      return rit;
    } catch (err) {
      console.error(err);
      return 'empty';
    }
  }

  private async defaultLsMacro(input: ExcalidrawElement, output: ExcalidrawElement): Promise<string[]> {
    const bit = this.getFullTree(input, output);
    // bit.pop();

    const cit = bit.join('').replace('~/Documents/', '/').replace('~/', '');

    try {
      // const dit = await this.executeDeno(`
      //   async function readDir() {
      //     const entries = await Deno.readDir('${cit}');
      //     return entries;
      //   }
      // `);

      const rit = await fetch(`http://localhost:8080${cit}`)
        .then(it => it.text()).then(text => {
          const parser = new DOMParser();
          const htmlDocument = parser.parseFromString(text, "text/html");
          const files = Array.from(htmlDocument.querySelectorAll('tr.file a')).map(it => it.href).filter(it => !it.endsWith('/')).map(xit => { const zit = xit.split('/'); return zit[zit.length - 1]; })
          const dirs = Array.from(htmlDocument.querySelectorAll('tr.file a')).map(it => it.href).filter(it => it.endsWith('/')).map(xit => { const zit = xit.split('/'); return zit[zit.length - 2]; })
          return { files, dirs };
        });

      const dit = [
        ...rit.files.map(lit => {
          return {
            name: lit,
            isFile: true,
            isDirectory: false,
          }
        }),
        ...rit.dirs.map(lit => {
          return {
            name: lit,
            isFile: false,
            isDirectory: true,
          }
        })
      ]

      let width = dit.length > 0 ? output.width / dit.length : output.width;
      let height = output.height;
      let x = output.x;
      let y = output.y;

      const egit = nanoid();

      let margin = input.fontSize ? input.fontSize * 1 : input.height * 2;

      const zit = [
      ];

      const frameId = nanoid();
      const mit =
        dit.filter(it => it.isFile);
      const groupIds = [...output.groupIds];
      if (groupIds.length == 0) {
        groupIds.push(nanoid());
      }
      for (const fit of mit) {
        const igit = nanoid();
        const kitId = nanoid();
        const litId = nanoid();
        const kit = {
          type: 'text',
          id: kitId,
          text: `${fit.name}`,
          // width,
          // height,
          groupIds: [...groupIds, igit],
          // frameId: frameId,
          x: x,
          y: output.y + output.height + margin,
          fontSize: input.fontSize,
          customData: {
            macros: {
              cat: true,
              write: true,
            },
            outputTo: litId,
            parentId: output.id,
          },
        };
        const akit = window.convertToExcalidrawElements([kit])[0];
        const lit = {
          type: 'text',
          id: litId,
          x: x,
          y: akit.y + akit.height,
          // frameId: frameId,
          groupIds: [...groupIds, igit],
          text: `${fit.isFile ? "<...file...content...here>" : "[--folder--]"}`,
          fontSize: akit.fontSize > 2 ? akit.fontSize - 1 : 2,
        }
        const alit = window.convertToExcalidrawElements([lit])[0];
        const wit = {
          id: nanoid(),
          type: 'arrow',
          x: output.x,
          y: output.y,
          width: kit.x - output.x,
          height: kit.y - output.y,
          start: {
            type: 'text',
            id: output.id,
            // gap: 1,
          },
          end: {
            type: 'text',
            id: kit.id,
            // gap: 1,
          },
          // label: {
          //   text: ``,
          // }
        };

        width = Math.max(alit.width, akit.width);
        x += width;
        x += margin;

        zit.push(kit);
        zit.push(lit);
        // zit.push(wit);
      }
      // const kit =
      // {
      //   id: frameId,
      //   type: 'frame',
      //   width: zit[zit.length - 1].x - zit[0].x,
      //   height: output.height,
      //   name: `${cit}`,
      //   x: output.x,
      //   y: output.y,
      //   // groupIds: [groupId],
      // };
      // zit.push(kit);
      const nit =
        dit.filter(it => it.isDirectory);
      // width = kit.width / nit.length;
      // height = kit.height;
      // x = kit.x;
      // margin = kit.height;
      // y = kit.y + kit.height + margin;

      // groupIds.push(egit);
      const xazit = zit.length > 0 ?
        Math.max(...zit.map(ezit => ezit.x)) : input.x;
      const weit = xazit + width - (zit[0] ? zit[0].x : input.x);
      const eweit =
        window.convertToExcalidrawElements([{
          type: 'text',
          fontSize: output.fontSize,
          text: '-',
          x: 0, y: 0,
        }])[0].width;
      const weweit = weit / eweit;
      const text = weweit > output.text.length && output.fontSize ? '/' + '-'.repeat(weweit) : output.text;
      let xaweit = output.width;
      const placeholder = output.text ?? '/-------------';
      for (const vit of nit) {
        const ritId = nanoid();
        const assit = nanoid();
        const qit = {
          id: nanoid(),
          type: 'text',
          text: `/${vit.name}`,
          // text: '/-------------',
          width: output.width,
          height: output.height,
          fontSize: output.fontSize,
          x: output.x + weit + xaweit,
          y: output.y,
          customData: {
            macros: {
              ls: true,
            },
            outputTo: ritId,
            parentId: output.id,
          },
          groupIds: [assit],
          // groupIds: [ugit],
        };
        xaweit += qit.width;
        zit.push(qit);
        const rit = {
          ...qit,
          customData: {
            parentId: qit.id,
          },
          y: qit.y + margin,
          text: placeholder,
          id: ritId,
          // groupIds: [assit],
        }
        zit.push(rit);
        const wit = {
          // id: nanoid(),
          type: 'arrow',
          x: output.x + weit,
          y: output.y,
          // y: kit.y + kit.height,
          width: xaweit,
          height: 10,
          start: {
            type: 'text',
            id: output.id,
            gap: 1,
          },
          // end: {
          //   type: 'text',
          //   id: qit.id,
          //   gap: 1,
          // },
          label: {
            text: `/${vit.name}`,
          }
        };
        // groupIds.push(git);
        // x += width;
        // zit.push(wit);
        // break;
      }

      zit.push({
        ...output,
        // frameId: frameId,
        groupIds,
        width: weit,
        text,
      });

      const result =
        window.convertToExcalidrawElements(zit);

      return result;
    } catch (err) {
      throw `ls macro: ${err.toString()}`;
    }
  }

  private getFullTree(it: ExcalidrawElement, out: ExcalidrawElement): string[] {
    const els = [...ea.getSceneElements()];

    let fullTree: string[] = [];

    const getIncomingArrow = (assit) =>
      assit.boundElements?.find(bit => {
        if (bit.type == 'arrow') {
          const cit = els.find(cit => cit.id == bit.id);
          if (cit && cit.endBinding.elementId == assit.id) {
            return true;
          }
        }
      });

    let xupit;
    let incomingArrow;

    incomingArrow = getIncomingArrow(it);
    if (!incomingArrow) {

      if (it?.customData?.parentId) {
        const upit = ea.getSceneElements().find(essit => essit.id == it.customData.parentId);
        if (upit) {
          if (upit?.customData?.parentId) {
            incomingArrow = {
              id: nanoid(),
            }
            els.push({
              id: incomingArrow.id,
              startBinding: {
                elementId: upit.id,
              },
              endBinding: {
                elementId: it.id,
              },
            })
          } else {
            incomingArrow = getIncomingArrow(upit);
            if (upit.text) {
              xupit = upit.text.replace(/^\/(\-)+/, '/');
            }
          }
        }
      } else {

        if (!incomingArrow) {
          for (const epit of it.groupIds) {
            const upit = els.find(kupit => kupit.groupIds.includes(epit) && (kupit.type == 'rectangle' || (kupit.type == 'text' && kupit.text.startsWith('/'))));
            if (upit) {
              incomingArrow = getIncomingArrow(upit);

              if (upit.text) {
                xupit = upit.text.replace(/^\/(\-)+/, '/');
              }
            }
          }
        }
      }

    }
    if (incomingArrow) {
      const bit = els.find(bit => bit.id == incomingArrow.id);
      const cit = els.find(cit => cit.type == 'text' && cit.id == bit.startBinding.elementId);
      if (cit) {
        const ecit = els.find(becit => becit.id == bit.endBinding.elementId);
        fullTree = [...fullTree, ...this.getFullTree(cit, ecit)];
      }
    }

    if (xupit) {
      fullTree.push(xupit);
    }

    if (it.text) {
      fullTree.push(it.text.replace(/^\/(\-)+/, '/'));
    }

    const outgoingArrow = it.boundElements?.find(bit => {
      if (bit.type == 'arrow') {
        const cit = els.find(cit => cit.id == bit.id);
        if (cit && cit.startBinding.elementId == it.id && cit.endBinding.elementId == out.id) {
          return true;
        }
      }
    });

    if (outgoingArrow) {
      const bit = els.find(bit => bit.id == outgoingArrow.id);
      if (bit && bit.type == 'arrow') {
        if (bit.boundElements) {
          const cit = bit.boundElements.find(cit => cit.type == 'text');
          if (cit) {
            const dit = els.find(dit => dit.id == cit.id);
            if (dit && dit.type == 'text') {
              fullTree.push(`${dit.text}`);
            }
          }
        } else {
          fullTree.push('/');
        }
      }
    }

    return fullTree;
  }

  private async defaultFetchMacro(input: ExcalidrawElement, output: ExcalidrawElement): Promise<string> {
    const urlTree = this.getFullTree(input, output);

    let url = urlTree.join('');

    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.startsWith('https://github.com')) {
          url = url.replace('https://github.com', 'https://raw.githubusercontent.com');
          if (url.includes('/tree')) {
            const branch = url.substring(url.indexOf('/tree')).split('/')[2];
            url = url.replace(`/tree/${branch}`, `/${branch}`);
          }
        }

        const response = await fetch(url);

        if (response.status == 200) {
          const text = await response.text();
          return text;
        }

        throw new Error(`not found ${url}`);
      } else if (url.startsWith('~/')) {
        const result = await this.executeDeno(`
                   async function readFile(input) {
          const text = await Deno.readTextFile('${url}');
return text;
        } 
          `) as string;
        return result;
      }
      throw new Error(`${url} is neither web link nor local root path`);
    } catch (err) {
      console.error(err);
      return url;
    }
  }

  private async defaultGpt4Macro(input: ExcalidrawElement, argument: string): Promise<string> {
    const gptScript = this.constructGptScript('gpt-4', window.OPENAI_KEY);
    const result = await this.executeDeno(
      gptScript,
      input,
      argument,
    ) as string;
    return result;
  }

  private async defaultGpt3Macro(input: ExcalidrawElement, argument: string): Promise<string> {
    const gptScript = this.constructGptScript('gpt-3.5-turbo', window.OPENAI_KEY);
    const result = await this.executeDeno(
      gptScript,
      input,
      argument,
    ) as string;
    return result;
  }

  private defaultJsMacro(input: ExcalidrawElement, argument: string): string {
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

  private defaultDenoMacro(input: ExcalidrawElement, argument: string): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultDenoMacro");
    try {
      if (input.type !== "text") throw "not ok";
      const macroSource = input.text;
      const regex = /function (\w+)\(/;
      const match = macroSource.match(regex);
      const functionName = (match && match[1]) || "AnonymousDeno";

      const wrappedFunction = (inputElement) => {
        return new Promise(async (resolve, reject) => {
          try {
            const response = await this.executeDeno(
              macroSource,
              inputElement,
            );
            return resolve(response);
          } catch (err) {
            console.error(err);
            return reject(err);
          }

        })
      };

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

  private async executeDeno(code: string, input?: ExcalidrawElement, argument?: string) {
    return new Promise(async (resolve, reject) => {
      const taskId = nanoid();
      this.registerCallback(taskId, (denoResult) => {
        if (denoResult.success) {
          return resolve(denoResult.data);
        } else {
          return reject(`deno error: ${denoResult?.error}`);
        }
      });
      try {
        if (!window.webui) throw `Oops.. backend macros only allowed in Desktop mode!`;
        window.webui.call('executeDeno', JSON.stringify({
          taskId,
          code,
          input: typeof input == 'object' ? input : {},
          argument: argument ?? '',
        }));
      } catch (err) {
        console.error(err);
        reject(err);
      }
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
          const kvBlob = await import('https://deno.land/x/kv_toolbox@0.0.4/blob.ts');
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

          window.showModal({
            title: "Confirm Transaction",
            description: `IPFS Link: ${ipfsLink}\nLayer Name: ${layerName}`,
            callback: async () => {
              const { caller } = await window.contracts.write({
                address: galaxyContractAddress,
                method: 'createLayer',
                args,
                metadata,
              });

              window.showModal({
                title: `galaxy://${caller}/${layerName}`,
                description: 'Transaction has been submitted',
              })
              return resolve(`galaxy://${caller}/${layerName}`);
            }
          });
        } catch (error) {
          this.log(`Error during publishing: ${error}`, "defaultPublishMacro");
          reject(error);
        }
      };

      window.showModal({
        title: "Connect Wallet",
        description: `Click Confirm to invoke Internet Identity`,
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

            const newElements = window.convertToExcalidrawElements(scene.elements.map(it => {
              return {
                ...it,
                id: nanoid(),
              }
            }));

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
