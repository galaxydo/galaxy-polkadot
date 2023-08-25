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

  return { browser, page };
}

describe("Excalidraw Frontend Tests", () => {
  it.only("should correctly use executeMacro to modify text elements", async () => {
    const { page, browser } = await beforeTest();

    await page.evaluateOnNewDocument(() => {
      const incrementByOne = (inputElement) => {
        if (inputElement.type != 'text') return 'should be text element';
        const inputText = inputElement.text;
        return String(parseInt(inputText, 10) + 1);
      }

      // this happens when executed "js" macro with function body as an input text element
      // ATTENTION: lets implement first unit test where we actually test that
       window.registerMacro("js", "incrementByOne", incrementByOne.toString());




      /*
      window.macros = {
        incrementByOne: (inputElement) => {
          if (inputElement.type != 'text') return 'should be text element';
          const inputText = inputElement.text;
          return String(parseInt(inputText, 10) + 1);
        }
      }
      */
    });



    await page.goto("http://localhost:5173");
    await page.waitForFunction(() => window.ea);

    const inputElId = "inputId";
    const outputElId = "outputId";

    const elements = [
      {
        id: inputElId,
        type: "text",
        text: "5",
        x: 100,
        y: 100,
      },
      {
        id: outputElId,
        type: "text",
        text: "",
        x: 200,
        y: 200,
      },
    ];

    await page.evaluate((elements) => {
      const excalidrawElements = window.convertToExcalidrawElements(elements);
      window.ea.updateScene({ elements: excalidrawElements });
      return window.ea.getSceneElements().length;
    }, elements);

    await page.evaluate(() => {
      window.ga.executeMacro("incrementByOne", "inputId", "outputId");
    });

    const updatedOutputElement = await page.evaluate((outputElId) => {
      return window.ea.getSceneElements().find(it => it.id == outputElId);
    }, outputElId);

    expect(updatedOutputElement.text).toBe("6");

    await browser.close();
  });
});
