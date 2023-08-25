import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
type MacroFunction = (
  input: ExcalidrawElement,
) => Promise<ExcalidrawElement[]>;

class GalaxyAPI {
  private macros: Record<string, MacroFunction>;

  constructor() {
    this.macros = {};

    console.log("GalaxyAPI", "constructor", new Date() / 1000);

    // Register default macros
    this.registerMacro("js", this.defaultJsMacro.bind(this));
    // ... You can similarly register 'deno' and 'python' if you have corresponding handlers.
  }

  registerMacro(name: string, fn: MacroFunction): void {
    console.log("GalaxyAPI", "registerMacro", name, fn);
    this.macros[name] = fn;
  }

  getMacro(name: string): MacroFunction | undefined {
    console.log("GalaxyAPI", "getMacro", name, this.macros[name]);
    return this.macros[name];
  }

  async executeMacro(
    name: string,
    input: ExcalidrawElement,
  ): Promise<ExcalidrawElement[]> {
    const macro = this.getMacro(name);
    console.log("GalaxyAPI", "executeMacro", name, input, macro);

    if (!macro) {
      throw new Error(`Macro with name ${name} is not registered.`);
    }

    const result = await macro(input);

    console.log("GalaxyAPI", "executeMacro", "result", JSON.stringify(result));

    return result;
  }

  private defaultJsMacro(input: ExcalidrawElement): ExcalidrawElement[] {
    try {
      console.log("GalaxyAPI", "defaultJsMacro", "input", input);
      if (input.type !== "text") throw "not ok";

      const macroSource = input.text;

      console.log("GalaxyAPI", "defaultJsMacro", "source", macroSource);
      const parsedFunction = Function(`return ${macroSource};`)();

      console.log(
        "GalaxyAPI",
        "defaultJsMacro",
        "parsedFunction",
        parsedFunction,
      );
      const functionName = parsedFunction.name || "Anonymous";
      console.log("GalaxyAPI", "defaultJsMacro", "functionName", functionName);
      this.registerMacro(functionName, parsedFunction);

      return convertToExcalidrawElements([{
        type: "text",
        text: `${functionName} registered at ${new Date().toTimeString()}`,
      }]);
    } catch (error) {
      console.log("GalaxyAPI", error);
      throw new Error("Error parsing function: " + error);
    }
  }
}

export default GalaxyAPI;
