const { Builder, By } = require("selenium-webdriver");
const fs = require("fs");
const { promisify } = require("util");

const BROWSER_LIST_FILE = "browsers.json";
const SCREEN_SIZES_FILE = "screensize.json";
const WEBSITE_DATA_FILE = "testdata.json";
const LOG_DIR = "logs";

async function runTests() {
    const browserList = require(`./${BROWSER_LIST_FILE}`).browser;
    const screenSizes = require(`./${SCREEN_SIZES_FILE}`);
    const websiteData = require(`./${WEBSITE_DATA_FILE}`);

    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR);
    }

    for (const browser of browserList) {
        const browserLogDir = `${LOG_DIR}/${browser.name}`;
        if (!fs.existsSync(browserLogDir)) {
            fs.mkdirSync(browserLogDir);
        }

        for (const screenSize of screenSizes[websiteData.screensizes]) {
            const logFilePath = `${browserLogDir}/${screenSize.width}x${screenSize.height}.log`;
            const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

            try {
                const driver = await new Builder()
                    .forBrowser(browser.name)
                    .build();

                const screenshotDir = `./screenshots/${browser.name}/${websiteData.screensizes}`;
                fs.mkdirSync(screenshotDir, { recursive: true });

                await driver.manage().window().setRect(screenSize);
                log(
                    logFilePath,
                    `Navigating to ${websiteData.url} in ${
                        browser.name
                    } with window size ${JSON.stringify(screenSize)}\n`
                );
                await driver.get(websiteData.url);

                for (const locator of websiteData.locators) {
                    log(
                        logFilePath,
                        `Locating ${locator.testName} using ${locator.type}: ${locator.value}`
                    );
                    const element = await driver.findElement(
                        By[locator.type](locator.value)
                    );

                    const screenshotDir = `./screenshots/${browser.name}/${websiteData.screensizes}`;
                    fs.mkdirSync(screenshotDir, { recursive: true });
                    const elementHash = `${screenSize.width}x${screenSize.height}-${locator.testName}`;
                    const screenshotFile = `${screenshotDir}/${elementHash}.png`;

                    if (!fs.existsSync(screenshotFile)) {
                        log(
                            logFilePath,
                            `Taking screenshot of ${locator.testName}`
                        );
                        await driver.executeScript(
                            "arguments[0].scrollIntoView(true)",
                            element
                        );
                        const data = await driver.takeScreenshot();
                        fs.writeFileSync(screenshotFile, data, "base64");
                    }

                    for (const assertion of locator.assertions) {
                        log(
                            logFilePath,
                            `Performing assertion ${assertion.name} on ${locator.testName}`
                        );
                        let result;

                        switch (assertion.type) {
                            case "isVisible":
                                result = await element.isDisplayed();
                                break;
                            case "value":
                                result = await element.getAttribute(
                                    assertion.value
                                );
                                break;
                            case "cssValue":
                                result = await element.getCssValue(
                                    assertion.value
                                );
                                break;
                            // Add other assertion types here
                        }

                        if (assertion.type == "value") {
                            let a = await element.getAttribute(assertion.value);
                            console.log(a);
                            console.log(assertion.expectedValue);
                        }

                        if (result !== assertion.expectedValue) {
                            const errorMsg = `Assertion failed: ${JSON.stringify(
                                screenSize
                            )}, ${locator.testName}, ${
                                assertion.name
                            }\n was expected ${
                                assertion.expectedValue
                            } but found ${result}\n`;
                            log(logFilePath, errorMsg);
                        } else {
                            log(
                                logFilePath,
                                `Assertion passed: ${JSON.stringify(
                                    screenSize
                                )}, ${locator.testName}, ${assertion.name}\n`
                            );
                        }
                    }
                }

                await driver.quit();
            } catch (err) {
                const errorMsg = `ERROR: ${JSON.stringify(
                    screenSize
                )}, ${err}\n`;
                log(logFilePath, errorMsg);
                await driver.quit();
            }
        }
    }
}

function log(logFilePath, message) {
    console.log(message);
    fs.appendFileSync(logFilePath, `${message}\n`);
}

runTests();
