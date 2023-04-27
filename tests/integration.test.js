const puppeteer = require("puppeteer");

describe("GalaxyUI", () => {
  let browser;
  let page;

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: "new",
    });
    page = await browser.newPage();
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

    await (await page.$('[data-test="loadButton"]')).click();

    expect(
      await page.$eval(
        '[data-test="loadDialog"] h3',
        (el) => el.textContent,
      ),
    ).toContain("Load scene");
  });
});
