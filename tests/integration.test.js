const puppeteer = require("puppeteer");
describe("GalaxyUI", () => {
  let browser;
  let page;

  let exampleAddress = '5GrpknVvGGrGH3EFuURXeMrWHvbpj3VfER1oX5jFtuGbfzCE';

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: true,
    });
    page = await browser.newPage();

    page.on("pageerror", (err) => {
      console.log("Unhandled browser error:", err);
      process.emit('uncaughtException', err);
    });
    await page.evaluateOnNewDocument((address) => {
      window.injectedWeb3 = {
        mockWallet: {
          connect: async () => {
            return {
              name: 'mockWallet',
              version: 'unknown',
              accounts: {
                get: async () => {
                  return [{ address, name: 'My Wallet' }];
                }
              }
            }
          },
        }
      }
    }, exampleAddress);
    await page.goto("http://localhost:5173");
    await page.waitForSelector('[data-test="loadButton"]');
  });

  afterEach(async () => {
    await browser.close();
  });

  it("renders the UI correctly", async () => {
    expect(
      await page.$eval(
        '[data-test="addButton"] img',
        (img) => img.getAttribute("src"),
      ),
    ).toBe("/src/assets/add-icon.svg");
    expect(
      await page.$eval(
        '[data-test="loadButton"] img',
        (img) => img.getAttribute("src"),
      ),
    ).toBe("/src/assets/get-icon.svg");
    expect(
      await page.$eval(
        '[data-test="walletButton"] img',
        (img) => img.getAttribute("src"),
      ),
    ).toBe("/src/assets/wallet-icon.svg");
    expect(
      await page.$(
        '[data-test="infoButton"] img',
      ),
    ).toBeNull();

    expect(await page.$('[data-test="loadDialog"]')).toBeNull();
  });

  it("displays the wallet button", async () => {
    const walletButton = await page.waitForSelector('[data-test="walletButton"]');
    expect(walletButton).not.toBeNull();
  });

  it("displays the address of the connected wallet in the 'Scene Details' dialog", async () => {
    await page.waitForSelector('[data-test="walletButton"]');
    await page.click('[data-test="walletButton"]');

    await page.waitForSelector('[data-test="connectButton"]');
    await page.click('[data-test="connectButton"]');

    await page.waitForSelector('[data-test="infoButton"]');
    await page.click('[data-test="infoButton"]');

    await page.waitForSelector('[data-test="infoDialog"]');

    const infoDialogContent = await page.$eval('[data-test="infoDialog"]', (el) => el.textContent);

    expect(infoDialogContent).toContain(exampleAddress);
  }, 60000);

  it("displays the load dialog", async () => {
    await (await page.$('[data-test="loadButton"]')).click();
    const loadDialog = await page.waitForSelector('[data-test="loadDialog"]');
    expect(loadDialog).not.toBeNull();
  });

  it("saves the scene and displays the saved IPFS hash", async () => {
    let myEmptyScene = 'QmaWF5ho5bYBNKFKUJMBhRTMUic1PrDeSP1V6PDArhGw91';

    await page.waitForSelector('[data-test="addButton"]');

    await page.click('[data-test="walletButton"]');

    await page.waitForSelector('[data-test="connectDialog"]');

    await page.click('[data-test="connectButton"]');

    await page.waitForSelector('[data-test="infoButton"]');

    await page.click('[data-test="addButton"]');

    await page.waitForSelector('[data-test="saveDialog"]');

    const sceneName = "My Scene";
    await page.type('[data-test="saveDialog"] input[type="text"]', sceneName);

    await page.click('[data-test="saveButton"]');

    await page.waitForSelector('[data-test="saveDialog"]', { hidden: true });
    await page.click('[data-test="infoButton"]');

    await page.waitForSelector('[data-test="infoDialog"]');

    const ipfsHash = await page.evaluate(() => {
      return document.querySelector('[data-test="infoDialog"] p[data-test="ipfsHash"]').textContent;
    });
    expect(ipfsHash).toContain(myEmptyScene);

    const savedSceneName = await page.evaluate(() => {
      return window.excalidraw.current.getAppState().name;
    });
    expect(savedSceneName).toEqual(sceneName);
  }, 60000);


  it("loads a scene from IPFS and verifies the expected elements", async () => {
    let exampleScene = 'QmZAcjtUEKquRrAcKbE5LjCLtoCc5KoYncX8n4TBBmTUSY';

    await page.waitForSelector('[data-test="loadButton"]');

    await page.click('[data-test="loadButton"]');

    await page.waitForSelector('[data-test="loadDialog"]');

    await page.type('[data-test="loadDialog"] input[type="text"]', exampleScene);

    await page.click('[data-test="getSceneButton"]');

    await page.waitForFunction(() => {
      return window.excalidraw.current.getSceneElements().length > 0;
    });

    const sceneElements = await page.evaluate(() => {
      return window.excalidraw.current.getSceneElements();
    });

    expect(sceneElements[0].text).toEqual("May 16");

    const sceneName = await page.evaluate(() => {
      return window.excalidraw.current.getAppState().name;
    });
    expect(sceneName).toEqual("May 16 Scene");
  }, 60000);
});
