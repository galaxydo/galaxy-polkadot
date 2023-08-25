const puppeteer = require("puppeteer");
// const convertToExcalidrawElements = require("@excalidraw/utils").convertToExcalidrawElements;
// const { convertToExcalidrawElements } = require("@excalidraw/utils");


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

  return { browser, page };
}

describe("Excalidraw Frontend Tests", () => {
  it("should correctly load elements using loadLayer", async () => {
    const { page, browser } = await beforeTest();
    await page.evaluateOnNewDocument(() => {
      window._mockMethodCalls = {};

      window.webui = {
        getLayer: (layerName) => {
          if (layerName === "FirstLayer") {
            return window.convertToExcalidrawElements([{
              id: "uniqueElementId1",
              type: "rectangle",
              x: 100,
              y: 100,
              width: 50,
              height: 50,
              frameId,
            },
            {
              id: "uniqueElementId2",
              type: "text",
              text: "MyLayer Element",
              x: 200,
              y: 200,
              frameId,
            }]);
          }
          return [];
        },
      };
    });

    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);


    const frameId = "first-frame";

    const inputElId = "FirstId";

    const elements = [
      {
        type: "arrow",
        x: 255,
        y: 239,
        label: {
          text: "=MyLayer",
        },
        start: {
          id: inputElId,
          type: "text",
          text: "FirstLayer",
        },
        end: {
          id: frameId,
          type: "frame",
        },
      },
    ];
    /*
        const elements = [{
          "type": "text",
          "text": "first",
          // "x": 0,
          "y": 0,
        }, {
          "type": "text",
          "text": "second",
          "x": 50,
          "y": 0,
        }]*/
    console.log('second')
    // Convert and load these elements into the page inside the browser context
    const loadedElementCount = await page.evaluate((elements) => {
      console.log('first')
      const excalidrawElements = window.convertToExcalidrawElements(elements);
      window.ea.updateScene({ elements: excalidrawElements })
      //window.ga.loadLayer({ elements: excalidrawElements });
      return window.ea.getSceneElements().length;
    }, elements);

    expect(loadedElementCount).toBe(4);

    const selectedElementIds = {[inputElId]: true};  // replace with the actual id
    await page.evaluate((selectedElementIds) => {
      window.ea.updateScene({ appState: { selectedElementIds } });
    }, selectedElementIds);

    const macroButton = await page.waitForSelector(`[data-testid="macro-button-MyLayer"]`);

    console.log('macroButton', macroButton)
    await macroButton.click();

    // TODO: show progress bar on the button

    const frameIdCount = await page.evaluate((frameId) => {
      // This assumes you have a method to get elements by frameId. 
      // Adjust accordingly if your method is different.
      return window.ea.getSceneElements().map(it => it.frameId == frameId).length;
    }, frameId);

    expect(frameIdCount).toBe(4); // fix: ACTUALLY 2!

    const updatedFrame = await page.evaluate((frameId) => {
      // This assumes you have a method to get elements by frameId. 
      // Adjust accordingly if your method is different.
      return window.ea.getSceneElements().find(it => it.id == frameId);
    }, frameId);

    // resized to fit its elements
    expect(updatedFrame.width).toBe(100); // fix: Should resize!
    expect(updatedFrame.height).toBe(100);

    await browser.close();
  });

  // ... Your previous "macro action buttons" test and other tests ...

  it.only("should show a 'Macro' button next to an element with a macro definition", async () => {
    const { page, browser } = await beforeTest();

    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    const macroElId = "macroId";

    const elements = [
      {
        id: macroElId,
        type: "text",
        text: "#[macro]\nincrementByOne: (inputElement) => { if (inputElement.type != 'text') return 'should be text element'; const inputText = inputElement.text; return String(parseInt(inputText, 10) + 1); }",
        x: 100,
        y: 100,
      }
    ];

    await page.evaluate((elements) => {
      const excalidrawElements = window.convertToExcalidrawElements(elements);
      window.ea.updateScene({ elements: excalidrawElements });
      return window.ea.getSceneElements().length;
    }, elements);

    const macroButton = await page.waitForSelector(`[data-testid="macro-label-macro"]`);
    expect(macroButton).toBeTruthy();

    const buttonLabel = await macroButton.evaluate(node => node.innerText);
    expect(buttonLabel).toBe("Macro");

    await browser.close();
  });
});
