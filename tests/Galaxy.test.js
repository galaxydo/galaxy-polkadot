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
async function validateMacroExecution(page, outputElementId, expectedFirstWord, originalPlaceholder) {
  await page.waitForFunction(([outputElementId, originalPlaceholder]) => {
    const el =
      window.ea.getSceneElements().find(it => it.id == outputElementId);
    return el && el.text != originalPlaceholder;
  }, {}, [outputElementId, originalPlaceholder]);
  const updatedOutputElement = await page.evaluate((outputElId) => {
    return window.ea.getSceneElements().find(it => it.id == outputElId);
  }, outputElementId);
  expect(updatedOutputElement.text.split(' ')[0]).toBe(expectedFirstWord);
}

async function validateUpdatedOutputElement(page, outputElementId, expectedText, originalPlaceholder) {
  await page.waitForFunction(([outputElementId, originalPlaceholder]) => {
    const el =
      window.ea.getSceneElements().find(it => it.id == outputElementId);
    return el && el.text != originalPlaceholder;
  }, {}, [outputElementId, originalPlaceholder]);
  const updatedOutputElement = await page.evaluate((outputElId) => {
    return window.ea.getSceneElements().find(it => it.id == outputElId);
  }, outputElementId);
  expect(updatedOutputElement.text).toBe(expectedText);
}
describe("Galaxy Macros Engine", () => {
  it("JS Macros", async () => {
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
      text: "placeholder",
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
    await validateMacroExecution(page, "jsMacroOutputId", "firstMacro", "placeholder");
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
    await validateUpdatedOutputElement(page, "outputId", "6", "placeholder");

    await browser.close();
  });

  it.only("Deno macros", async () => {
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
        call: function(method, data) {
          if (method !== "executeDeno") {
            return;
          }

          const { taskId, code: macroSource } = data;

          if (macroSource.includes("function secondMacro(inputElement)")) {
            const result = 'hundred twenty';
            window.ga.executeCallback(taskId, { success: true, data: result });
            return result;
          } else {
            const error = "Invalid macro source received.";
            window.ga.executeCallback(taskId, { success: false, error: error });
            throw new Error(error);
          }
        },
      };
    });
    await executeMacroOnPage(page, "macro-button-deno");
    await validateMacroExecution(page, "denoOutputId", "secondMacro", "Deno result placeholder");

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
    await validateUpdatedOutputElement(page, "outputId", "hundred twenty", "placeholder");

    await browser.close();
  });

  it("Python macros", async () => {
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
    await validateMacroExecution(page, "pythonMacroOutputId", "factorial", "Python macro result placeholder");

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
        call: function(methodName, macroSource) {
          if (methodName === "executePython") {
            // For this test, just assert the macroSource and return a static value.
            if (macroSource.includes("def factorial(n):")) {
              return '120';
            } else {
              throw new Error("Invalid macro source received.");
            }
          } else {
            throw new Error(`Invalid method name: ${methodName}`);
          }
        },
      };
    });
    await executeMacroOnPage(page, "macro-button-factorial");
    await validateUpdatedOutputElement(page, "outputId", "120", "placeholder");

    await browser.close();
  });
  it("Open Macro", async () => {
    // also should work with simply local name simply ipfs link, but the above case scenario is most complex
    const { page, browser } = await beforeTest();

    // Navigate to the application.
    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    const layerName = 'remote layer';
    const galaxyLink = `galaxy://user/${layerName}`;
    const ipfsLink = 'ipfs://1xx';

    await page.evaluate((galaxyLink, ipfsLink) => {
      window.contracts = {
        read: ({ method, args, metadata, options }) => {
          if (method !== 'resolveLink') {
            return Promise.reject(new Error('Invalid method.'));
          }
          console.log('! args', JSON.stringify(args));

          if (args[0] == 'user' && args[1] === galaxyLink) {
            return Promise.resolve({ value: { decoded: { Ok: ipfsLink } } });
          } else {
            return Promise.reject(new Error('first'));
          }
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
      window.galaxyMetadata = 'mock';
    }, layerName, ipfsLink);

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
    await page.waitForFunction((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement?.name != null;
    }, {}, frameId);

    const updatedFrame = await page.evaluate((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement;
    }, frameId);

    expect(updatedFrame.name).toBe(ipfsLink);

    await browser.close();

  });
  it("Publish Macro", async () => {
    const { page, browser } = await initializeTestPage();

    await page.evaluate(() => {
      window.contracts = {
        write: async ({ address, method, args, metadata }) => {
          if (method !== "createLayer" || !args || args.length !== 2) {
            throw new Error("Invalid call to contracts.write");
          }

          const [layerName, ipfsLink] = args;
          console.log('GalaxyAPI', `Writing to contract: Address ${address}, Method ${method}, Args ${args}`);

          return {
            gasRequired: 1000000,  // Mock gas required
            continueWithTransaction: async ({ onSuccess, onStatus }) => {
              const mockTransactionId = 'mock-transaction-id';
              onSuccess(mockTransactionId);
            },
            caller: 'mock-caller-address' // Mock caller address
          };
        },
      };
      window.connect = () => true;
    });

    await page.evaluate(() => {
      window.ipfs = {
        upload: async (data) => {
          // if (!data || data.elements instanceof Array || typeof data.files !== 'object') {
          //   return ["Invalid call to ipfs.upload", null];
          // }

          const mockIpfsLink = 'ipfs://example-ipfs-link'; // Mock IPFS link
          return [null, mockIpfsLink];
        },
      };
    });

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

    // Click the confirm button.
    let modalConfirmButton = await page.$(`[data-testid="modal-button"]`);
    await modalConfirmButton.click();

    // Fill in a layer name in the modal input field.
    await page.waitForSelector(`[data-testid="modal-input"]`);
    const layerInput = await page.$(`[data-testid="modal-input"]`);
    expect(layerInput).toBeTruthy();
    await layerInput.type('layerName');
    // confirm layer name
    modalConfirmButton = await page.$(`[data-testid="modal-button"]`);
    await modalConfirmButton.click();
    // confirm transaction
    await page.waitForSelector(`[data-testid="modal-dialog"]`);
    modalConfirmButton = await page.$(`[data-testid="modal-button"]`);
    await modalConfirmButton.click();
    await page.waitForFunction((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement?.name != null;
    }, {}, frameId);

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

  it("Save Macro", async () => {
    const { page, browser } = await initializeTestPage();

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

    await page.evaluate(([frameId, layerName]) => {
      window.webui = {
        call: function(method, data) {
          if (method !== "executeDeno") {
            return;
          }
          const { taskId, code: script } = JSON.parse(data);

          if (script.includes("kv_toolbox") && script.includes(layerName)) {
            const currentDate = new Date().toLocaleDateString();
            const denoResult =
              { success: true, data: `${layerName} - ${currentDate}` };
            console.log('! denoResult', JSON.stringify(denoResult));
            window.ga.executeCallback(taskId, denoResult);
            return denoResult;
          } else {
            throw new Error(`Invalid script received: ${script}`);
          }
        },
      };
    }, [frameId, layerName]);
    // Trigger the save operation.
    await saveButton.click();
    // Wait for and validate the modal.
    // await page.waitForSelector(`[data-testid="loading-indicator-save"]`, { hidden: false });
    const modal = await page.waitForSelector(`[data-testid="modal-dialog"]`);
    expect(modal).toBeTruthy();

    // Fill in the modal input and confirm saving.
    const layerInput = await modal.$(`[data-testid="modal-input"]`);
    await layerInput.type(layerName);
    const modalSaveButton = await modal.$(`[data-testid="modal-button"]`);
    await modalSaveButton.click();
    // Wait for the saving process to complete.
    // await page.waitForSelector(`[data-testid="loading-indicator-save"]`, { hidden: true });

    await page.waitForFunction((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement?.name != null;
    }, {}, frameId);
    console.log('e')
    // Validate the frame's updated name.
    const updatedFrameName = await page.evaluate((frameId) => {
      const frameElement = window.ea.getSceneElements().find(it => it.id === frameId);
      return frameElement ? frameElement.name : null;
    }, frameId);

    expect(updatedFrameName.includes(layerName)).toBe(true);

    await browser.close();
  });
});
