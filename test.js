const { Builder, By } = require('selenium-webdriver');
const fs = require('fs');
const { promisify } = require('util');

const BROWSER_LIST_FILE = 'browsers.json';
const SCREEN_SIZES_FILE = 'screensize.json';
const WEBSITE_DATA_FILE = 'testdata.json';
const LOG_DIR = 'logs';

// Import necessary modules and define constant variables

async function runTests() {
    // Asynchronous function to run tests

    const browserList = require(`./${BROWSER_LIST_FILE}`).browser;
    const screenSizes = require(`./${SCREEN_SIZES_FILE}`);
    const websiteData = require(`./${WEBSITE_DATA_FILE}`);

    // Load browser list, screen sizes, and website data from corresponding JSON files

    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR);
    }

    // Create a logs directory if it doesn't exist

    for (const browser of browserList) {
        const browserLogDir = `${LOG_DIR}/${browser.name}`;
        if (!fs.existsSync(browserLogDir)) {
            fs.mkdirSync(browserLogDir);
        }

        // Create a directory for the specific browser in the logs directory if it doesn't exist

        for (const screenSize of screenSizes[websiteData.screensizes]) {
            const logFilePath = `${browserLogDir}/${screenSize.width}x${screenSize.height}.log`;
            const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

            // Create a log file for each screen size in the browser directory and open a write stream

            try {
                const driver = await new Builder()
                    .forBrowser(browser.name)
                    .build();

                // Create a Selenium WebDriver instance for the specified browser

                const screenshotDir = `./screenshots/${browser.name}/${websiteData.screensizes}`;
                fs.mkdirSync(screenshotDir, { recursive: true });

                // Create a screenshot directory for the specific browser and screen size if it doesn't exist

                await driver.manage().window().setRect(screenSize);
                log(
                    logFilePath,
                    `Navigating to ${websiteData.url} in ${
                        browser.name
                    } with window size ${JSON.stringify(screenSize)}\n`
                );
                await driver.get(websiteData.url);

                // Set the window size, navigate to the website, and log the details

                for (const locator of websiteData.locators) {
                    log(
                        logFilePath,
                        `Locating ${locator.testName} using ${locator.type}: ${locator.value}`
                    );
                    const element = await driver.findElement(
                        By[locator.type](locator.value)
                    );

                    // Find the web element using the specified locator strategy and value

                    const screenshotDir = `./screenshots/${browser.name}/${websiteData.screensizes}`;
                    fs.mkdirSync(screenshotDir, { recursive: true });
                    const elementHash = `${screenSize.width}x${screenSize.height}-${locator.testName}`;
                    const screenshotFile = `${screenshotDir}/${elementHash}.png`;

                    // Create a screenshot file path and name based on the screen size and locator details

                    if (!fs.existsSync(screenshotFile)) {
                        log(
                            logFilePath,
                            `Taking screenshot of ${locator.testName}`
                        );
                        await driver.executeScript(
                            'arguments[0].scrollIntoView(true)',
                            element
                        );
                        const data = await driver.takeScreenshot();
                        fs.writeFileSync(screenshotFile, data, 'base64');
                    }

                    // Take a screenshot of the element if the screenshot file doesn't exist

                    for (const assertion of locator.assertions) {
                        log(
                            logFilePath,
                            `Performing assertion ${assertion.name} on ${locator.testName}`
                        );
                        let result;

                        switch (assertion.type) {
                            case 'isVisible':
                                result = await element.isDisplayed();
                                break;
                            case 'value':
                                result = await element.getAttribute(
                                    assertion.value
                                );
                                break;
                            case 'cssValue':
                                result = await element.getCssValue(
                                    assertion.value
                                );
                                break;
                            // Add other assertion types here
                        }

                        // Perform different types of assertions on the element and record the result

                        if (assertion.type == 'value') {
                            let a = await element.getAttribute(assertion.value);
                            console.log(a);
                            console.log(assertion.expectedValue);
                        }

                        // Log the actual and expected values for the "value" assertion type (for debugging purposes)

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

                        // Log the assertion result based on whether it passed or failed
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

            // Handle any errors that occur during test execution and log the details
        }
    }
}

function log(logFilePath, message) {
    console.log(message);
    fs.appendFileSync(logFilePath, `${message}\n`);
}

// Utility function to log messages to the console and append them to a log file

runTests();
// Execute the test suite
