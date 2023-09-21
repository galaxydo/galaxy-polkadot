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
      if (!message.text().includes('GalaxyAPI') && !message.text().startsWith('!')) return;
      console.log(message.text());
      // console.log(message.location(), `${message.text()}`);
    } catch (err) { }
  });
  process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Promise Rejection:', reason);
    browser.close();
    // Close browser and exit process
  });

  return { browser, page };
}




async function initializeTestPage() {
  const pageSetup = await beforeTest();
  await navigateToTestApp(pageSetup.page);
  return pageSetup;
}

async function navigateToTestApp(page) {
  await page.goto("http://localhost:5173");
  await page.waitForFunction(() => window.ea);
}

// Helper to setup the scene given a set of elements and focus on a particular input element.
async function setupSceneOnPage(page, elements, focusedElementId) {
  await page.evaluate(([elements, focusedElementId]) => {
    const excalidrawElements = window.convertToExcalidrawElements(elements);
    window.ea.updateScene({ elements: excalidrawElements });
    window.ea.updateScene({ appState: { selectedElementIds: { [focusedElementId]: true } } });
  }, [elements, focusedElementId]);
}

// Helper to execute a macro.
async function executeMacroOnPage(page, macroButtonTestId) {
  const macroButton = await page.waitForSelector(`[data-testid="${macroButtonTestId}"]`);
  await macroButton.click();
}
async function validateMacroExecution(page, outputElementId, expectedFirstWord) {
  const updatedOutputElement = await page.evaluate((outputElId) => {
    return window.ea.getSceneElements().find(it => it.id == outputElId);
  }, outputElementId);
  expect(updatedOutputElement.text.split(' ')[0]).toBe(expectedFirstWord);
}

async function validateUpdatedOutputElement(page, outputElementId, expectedText) {
  const updatedOutputElement = await page.evaluate((outputElId) => {
    return window.ea.getSceneElements().find(it => it.id == outputElId);
  }, outputElementId);
  expect(updatedOutputElement.text).toBe(expectedText);
}
describe("Galaxy Macros Engine", () => {
  it("should correctly register and execute a JS macro, then execute the defined firstMacro", async () => {
    const { page, browser } = await initializeTestPage();

    function firstMacro(inputElement) {
      const inputText = inputElement.text;
      return String(parseInt(inputText, 10) + 1);
    };

    const elementsJSMacro = [{
      type: 'text',
      id: "jsMacroInputId",
      text: firstMacro.toString(),
    }, {
      type: 'text',
      id: "jsMacroOutputId",
      text: "JS macro result placeholder",
    }, {
      type: "arrow",
      x: 100,
      y: 100,
      label: {
        text: "=js",
      },
      start: {
        id: "jsMacroInputId",
        type: "text",
      },
      end: {
        id: "jsMacroOutputId",
        type: "text",
      },
    }];
    await setupSceneOnPage(page, elementsJSMacro, "jsMacroInputId");

    await executeMacroOnPage(page, "macro-button-js");
    await validateMacroExecution(page, "jsMacroOutputId", "firstMacro");

    // Setup and execute the "firstMacro" using the defined JS macro
    const elementsFirstMacro = [{
      type: 'text',
      id: "inputId",
      text: "5",
    }, {
      type: 'text',
      id: "outputId",
      text: "placeholder",
    }, {
      type: "arrow",
      x: 200,
      y: 200,
      label: {
        text: "=firstMacro",
      },
      start: {
        id: "inputId",
        type: "text",
      },
      end: {
        id: "outputId",
        type: "text",
      },
    }];
    await setupSceneOnPage(page, elementsFirstMacro, "inputId");

    await executeMacroOnPage(page, "macro-button-firstMacro");
    await validateUpdatedOutputElement(page, "outputId", "6");

    await browser.close();
  });

  it("should correctly register and execute a Deno macro", async () => {
    const { page, browser } = await initializeTestPage();

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

    const elementsDeno = [{
      type: 'text',
      id: "denoInputId",
      text: secondMacro.toString(),
    }, {
      type: 'text',
      id: "denoOutputId",
      text: "Deno result placeholder",
    }, {
      type: "arrow",
      x: 200,
      y: 200,
      label: {
        text: "=deno",
      },
      start: {
        id: "denoInputId",
        type: "text",
      },
      end: {
        id: "denoOutputId",
        type: "text",
      },
    }];
    await setupSceneOnPage(page, elementsDeno, "denoInputId");

    await page.evaluate(() => {
      window.webui = {
        executeDeno: function(macroSource) {
          if (macroSource.includes("function secondMacro(inputElement)")) {
            return 'hundred twenty';
          } else {
            throw new Error("Invalid macro source received.");
          }
        },
      };
    });

    await executeMacroOnPage(page, "macro-button-deno");
    await validateMacroExecution(page, "denoOutputId", "secondMacro");

    const elementsSecondMacro = [{
      type: 'text',
      id: "inputId",
      text: "5",
    }, {
      type: 'text',
      id: "outputId",
      text: "placeholder",
    }, {
      type: "arrow",
      x: 200,
      y: 200,
      label: {
        text: "=secondMacro",
      },
      start: {
        id: "inputId",
        type: "text",
      },
      end: {
        id: "outputId",
        type: "text",
      },
    }];
    await setupSceneOnPage(page, elementsSecondMacro, "inputId");

    await executeMacroOnPage(page, "macro-button-secondMacro");
    await validateUpdatedOutputElement(page, "outputId", "hundred twenty");

    await browser.close();
  });

  it("should correctly register and execute a Python macro, then execute the defined factorial function", async () => {
    const { page, browser } = await initializeTestPage();

    // Define the Python function
    const pythonFunction = `
            def factorial(n):
                if n == 0:
                    return 1
                else:
                    return n * factorial(n-1)
    `;

    // Setup and execute the Python macro to define "factorial"
    const elementsPythonMacro = [{
      type: 'text',
      id: "pythonMacroInputId",
      text: pythonFunction,
    }, {
      type: 'text',
      id: "pythonMacroOutputId",
      text: "Python macro result placeholder",
    }, {
      type: "arrow",
      x: 250,
      y: 250,
      label: {
        text: "=python",
      },
      start: {
        id: "pythonMacroInputId",
        type: "text",
      },
      end: {
        id: "pythonMacroOutputId",
        type: "text",
      },
    }];

    await setupSceneOnPage(page, elementsPythonMacro, "pythonMacroInputId");

    await executeMacroOnPage(page, "macro-button-python");
    await validateMacroExecution(page, "pythonMacroOutputId", "factorial");

    // Setup and execute the "factorial" using the defined Python macro
    const elementsFactorial = [{
      type: 'text',
      id: "inputId",
      text: "5",
    }, {
      type: 'text',
      id: "outputId",
      text: "placeholder",
    }, {
      type: "arrow",
      x: 250,
      y: 250,
      label: {
        text: "=factorial",
      },
      start: {
        id: "inputId",
        type: "text",
      },
      end: {
        id: "outputId",
        type: "text",
      },
    }];

    await setupSceneOnPage(page, elementsFactorial, "inputId");
    await page.evaluate(() => {
      window.webui = {
        executePython: function(macroSource) {
          // For this test, just assert the macroSource and return a static value.
          if (macroSource.includes("def factorial(n):")) {
            return '120';
          } else {
            throw new Error("Invalid macro source received.");
          }
        },
      };
    });

    await executeMacroOnPage(page, "macro-button-factorial");
    await validateUpdatedOutputElement(page, "outputId", "120");

    await browser.close();
  });
  it("should resolve galaxy layer name into ipfs link, download it from ipfs with kubo client, update scene with new elements and images", async () => {
    // also should work with simply local name simply ipfs link, but the above case scenario is most complex
    const { page, browser } = await beforeTest();

    // Navigate to the application.
    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    const layerName = 'remote layer';
    const galaxyLink = `galaxy://${layerName}`;
    const ipfsLink = 'ipfs://1xx';

    await page.evaluate((galaxyLink, ipfsLink) => {
      window.wallet = {
        readContract: (contract, method, value) => {
          if (value != galaxyLink) throw 'first';
          // resolves into ipfs://1xx from contract mapping
          return Promise.resolve(ipfsLink)
        }
      };
      window.ipfs = {
        download: (link) => {
          // returns list of elements
          const elements = [{
            type: 'text',
            text: 'first',
          }]
          return Promise.resolve({
            elements: window.convertToExcalidrawElements(elements),
          })
        }
      }
    }, galaxyLink, ipfsLink);

    // Define test data.
    const frameId = "frameId";
    const elements = [{
      type: 'frame',
      id: frameId,
      bounds: { x1: 100, y1: 100, x2: 300, y2: 300 },
      customData: {
        macros: {
          save: true,
          open: true,
        }
      }
    }];

    await setupSceneOnPage(page, elements, frameId);

    await executeMacroOnPage(page, "macro-button-open");

    // Wait for and validate the modal.
    await page.waitForSelector(`[data-testid="loading-indicator-open"]`, { hidden: false });
    const modal = await page.waitForSelector(`[data-testid="modal-dialog"]`);
    expect(modal).toBeTruthy();

    // Fill in the modal input and confirm saving.
    const layerInput = await modal.$(`[data-testid="modal-input"]`);
    await layerInput.type(galaxyLink);
    const modalSaveButton = await modal.$(`[data-testid="modal-button"]`);
    await modalSaveButton.click();

    // Wait for the saving process to complete.
    await page.waitForSelector(`[data-testid="loading-indicator-save"]`, { hidden: true });

    // Validate the frame's updated name.
    const updatedFrameName = await page.evaluate((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement ? frameElement.name : null;
    }, frameId);

    expect(updatedFrameName.includes(layerName)).toBe(true);

    await browser.close();

  });
  it.only("should publish layer elements and images uploading to IPFS then broadcasting to smart contract map", async () => {
    // Arrange: Set up the initial state for the test.
    const { page, browser } = await initializeTestPage();

    // Mock behavior for window.contracts.write.
    await page.evaluate(() => {
      window.contracts = {
        write: async ({ address, method, args }) => {
          // Mock behavior for writing to a smart contract.
          // Check that the method is "publish" and args contain layer name and ipfs link.
          if (method !== "saveLayer" || !args || args.length !== 2) {
            throw new Error("Invalid call to contracts.write");
          }

          const [layerName, ipfsLink] = args;
          console.log('GalaxyAPI', `Writing to contract: Address ${address}, Method ${method}, Args ${args}`);

          // Return a promise that resolves instantly with a mock transaction ID.
          const mockTransactionId = 'mock-transaction-id'; // Mock transaction ID
          return Promise.resolve(mockTransactionId);
        },
      };
    });

    // Mock behavior for window.ipfs.upload.
    await page.evaluate(() => {
      window.ipfs = {
        upload: async (elements) => {
          // Mock behavior for uploading to IPFS.
          // Check that elements is an array of scene elements.
          if (!Array.isArray(elements)) {
            throw new Error("Invalid call to ipfs.upload");
          }

          // Return a mock IPFS link.
          const mockIpfsLink = 'ipfs://example-ipfs-link'; // Mock IPFS link
          return mockIpfsLink;
        },
      };
    });

    // Act: Perform the actions necessary to test the publish functionality.
    // Spawn and select a frame element.
    const frameId = "frameId";
    const elements = [
      {
        type: 'frame',
        id: frameId,
        bounds: { x1: 100, y1: 100, x2: 300, y2: 300 },
        customData: {
          macros: {
            save: true,
            open: true,
            publish: true, // Add the publish flag to the customData.
          },
        },
      },
    ];

    await setupSceneOnPage(page, elements, frameId);

    // Click on the publish macro button.
    await executeMacroOnPage(page, "macro-button-publish");

    // Wait for and validate the modal.
    await page.waitForSelector(`[data-testid="modal-dialog"]`);
    const modal = await page.$(`[data-testid="modal-dialog"]`);
    expect(modal).toBeTruthy();

    // Fill in a layer name in the modal input field.
    const layerInput = await modal.$(`[data-testid="modal-input"]`);
    expect(layerInput).toBeTruthy();
    await layerInput.type('layerName');

    // Click the confirm button.
    const modalConfirmButton = await modal.$(`[data-testid="modal-button"]`);
    await modalConfirmButton.click();

    // Validate the frame's updated name.
    const updatedFrameName = await page.evaluate((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement ? frameElement.name : null;
    }, frameId);

    expect(updatedFrameName.includes('layerName')).toBe(true);

    // Wait for success notification to appear.
    // await page.waitForSelector(`[data-testid="notification-success"]`, { visible: true });

    // Assert: Verify that the notification message includes the mock transaction ID.
    // const notificationText = await page.$eval(`[data-testid="notification-success"]`, (notification) => notification.textContent);
    // const mockTransactionId = 'mock-transaction-id'; // Replace with your actual mock transaction ID
    // expect(notificationText).toContain(mockTransactionId);

    // Close the browser to end the test.
    await browser.close();
  });

  it("should correctly update frame name with output from save macro", async () => {
    const { page, browser } = await beforeTest();

    // Navigate to the application.
    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    // Define test data.
    const frameId = "frameId";
    const layerName = 'TestLayer';
    const elements = [{
      type: 'frame',
      id: frameId,
      bounds: { x1: 100, y1: 100, x2: 300, y2: 300 },
      customData: {
        macros: {
          save: true,
          open: true,
        }
      }
    }];

    // Update the scene with the frame and select it.
    await page.evaluate(([elements, frameId]) => {
      const excalidrawElements = window.convertToExcalidrawElements(elements);
      window.ea.updateScene({ elements: excalidrawElements });
      window.ea.updateScene({ appState: { selectedElementIds: { [frameId]: true } } });
    }, [elements, frameId]);

    // Wait for and validate the save button.
    const saveButton = await page.waitForSelector(`[data-testid="macro-button-save"]`);
    expect(saveButton).toBeTruthy();

    // Mock the Deno execution with expected behavior.
    await page.evaluate(([frameId, layerName]) => {
      window.webui = {
        executeDeno: function(script) {
          if (script.includes("Deno.KV.put") && script.includes(frameId)) {
            const currentDate = new Date().toLocaleDateString();
            return { success: true, details: `${layerName} - ${currentDate}` };
          } else {
            throw new Error(`Invalid script received: ${script}`);
          }
        },
      };
    }, [frameId, layerName]);

    // Trigger the save operation.
    await saveButton.click();

    // Wait for and validate the modal.
    await page.waitForSelector(`[data-testid="loading-indicator-save"]`, { hidden: false });
    const modal = await page.waitForSelector(`[data-testid="modal-dialog"]`);
    expect(modal).toBeTruthy();

    // Fill in the modal input and confirm saving.
    const layerInput = await modal.$(`[data-testid="modal-input"]`);
    await layerInput.type(layerName);
    const modalSaveButton = await modal.$(`[data-testid="modal-button"]`);
    await modalSaveButton.click();

    // Wait for the saving process to complete.
    await page.waitForSelector(`[data-testid="loading-indicator-save"]`, { hidden: true });

    // Validate the frame's updated name.
    const updatedFrameName = await page.evaluate((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement ? frameElement.name : null;
    }, frameId);

    expect(updatedFrameName.includes(layerName)).toBe(true);

    await browser.close();
  });
});
