import GalaxyAPI from '../src/GalaxyAPI.ts';

describe('GalaxyAPI', () => {
  let ga: GalaxyAPI;

  beforeEach(() => {
    ga = new GalaxyAPI();
  });

  it('should register a macro', () => {
    const macroFn: MacroFunction = (input: any) => input; // specify type here
    ga.registerMacro('test', macroFn);
    expect(ga.macros['test']).toBeDefined();
  });

  // ... other tests
});
