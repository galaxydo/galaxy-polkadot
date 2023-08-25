const puppeteer = require("puppeteer");

const beforeTest = async () => {
  let browser;
  let page;

  browser = await puppeteer.launch({
    headless: "new",
  });
  page = await browser.newPage();
  page.on("pageerror", (err) => {
    console.log("Unhandled browser error:", err);
    process.emit('uncaughtException', err);
  });
  page.on('console', message => {
    try {
      if (!message.text().startsWith('GalaxyAPI')) return;
      console.log(message.location(), `${message.text()}`);
    } catch (err) { }
  });
  process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Promise Rejection:', reason);
    // Close browser and exit process
  });

  return { browser, page };
}

// remember to extract its name in registerMacro
function firstMacro(inputElement) {
  const inputText = inputElement.text;
  return String(parseInt(inputText, 10) + 1);
};

function secondMacro(inputElement) {
  console.log('GalaxyAPI', 'secondMacro', JSON.stringify(inputElement));
  const inputText = inputElement.text;
  function factorial(n) {
    if (n === 0) return 1;
    return n * factorial(n - 1);
  }
  const n = parseInt(inputElement.text, 10);
  return String(factorial(n));
};

describe("Galaxy Macros Engine", () => {
  it("should register the macro correctly", async () => {
    const { page, browser } = await beforeTest();

    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    const inputId = "inputId";
    const outputId = "outputId";
    const elements = [{
      type: 'text',
      id: inputId,
      text: firstMacro.toString(),
    }, {
      type: 'text',
      id: outputId,
      text: '',
    },
    {
      type: "arrow",
      x: 150,
      y: 150,
      label: {
        text: "=js",
      },
      start: {
        id: inputId,
        type: "text",
      },
      end: {
        id: outputId,
        type: "text",
      },
    }
    ];

    await page.evaluate((elements) => {
      const excalidrawElements = window.convertToExcalidrawElements(elements);
      window.ea.updateScene({ elements: excalidrawElements });
    }, elements);

    const selectedElementIds = { [inputId]: true };
    await page.evaluate(([selectedElementIds, firstMacro]) => {
      window.ea.updateScene({ appState: { selectedElementIds } });
    }, [selectedElementIds, firstMacro.toString()]);
    // Wait for the macro registration button to appear and then click it
    const macroButton = await page.waitForSelector(`[data-testid="macro-button-js"]`);
    await macroButton.click();

    const registeredMacro = await page.evaluate(() => {
      return window.ga.getMacro('firstMacro');
    });

    console.log('registeredMacro', registeredMacro);
    expect(registeredMacro).toBeDefined();

    const updatedOutputElement = await page.evaluate((outputElId) => {
      return window.ea.getSceneElements().find(it => it.id == outputElId);
    }, outputId);

    expect(updatedOutputElement.text.split(' ')[0]).toBe('firstMacro');

    await browser.close();
  });

  it("should correctly use the registered macro to modify text elements", async () => {
    const { page, browser } = await beforeTest();

    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    const inputId = "inputId";
    const outputId = "outputId";
    const elements = [{
      type: 'text',
      id: inputId,
      text: "5",
    }, {
      type: 'text',
      id: outputId,
      text: "result placeholder",
    },
    {
      type: "arrow",
      x: 150,
      y: 150,
      label: {
        text: "=secondMacro",
      },
      start: {
        id: inputId,
        type: "text",
      },
      end: {
        id: outputId,
        type: "text",
      },
    }
    ];

    // Select the input element
    const selectedElementIds = { [inputId]: true };
    await page.evaluate(async ([selectedElementIds, secondMacro, elements]) => {
      const parsedFunction = Function(`return ${secondMacro};`)();
      window.ga.registerMacro("secondMacro", parsedFunction);

      const excalidrawElements = window.convertToExcalidrawElements(elements);
      window.ea.updateScene({ elements: excalidrawElements });

      window.ea.updateScene({ appState: { selectedElementIds } });
    }, [selectedElementIds, secondMacro.toString(), elements]);

    // Wait for the macro execution button to appear and then click it
    const macroButton = await page.waitForSelector(`[data-testid="macro-button-secondMacro"]`);
    await macroButton.click();

    const updatedOutputElement = await page.evaluate((outputElId) => {
      return window.ea.getSceneElements().find(it => it.id == outputElId);
    }, outputId);

    expect(updatedOutputElement.text).toBe("120");
    await browser.close();
  });
});
