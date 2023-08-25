const GalaxyAPI = require('../src/GalaxyAPI.ts').default;

describe("GalaxyAPI", () => {
  let api;

  beforeEach(() => {
    api = new GalaxyAPI();
  });

  it("should register a macro", () => {
    const myMacro = input => input;
    api.registerMacro('myMacro', myMacro);

    expect(api.getMacro('myMacro')).toBe(myMacro);
  });

  it("should execute a registered macro", () => {
    const myMacro = input => `Hello, ${input}!`;
    api.registerMacro('myMacro', myMacro);

    const result = api.executeMacro('myMacro', 'John');
    expect(result).toBe('Hello, John!');
  });

  it("should throw an error if trying to execute a non-existent macro", () => {
    expect(() => {
      api.executeMacro('nonExistentMacro', 'test');
    }).toThrow(`Macro "nonExistentMacro" not found`);
  });

  it("should have a default JS macro", () => {
    const result = api.executeMacro('js', `() => 'world'`);
    expect(result).toBe('world');
  });

  it("should handle errors in the JS macro", () => {
    expect(() => {
      api.executeMacro('js', "(() => { throw new Error('Test error') })()");
    }).toThrow("Error executing JS macro: Test error");
  });
});
