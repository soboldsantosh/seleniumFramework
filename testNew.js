const { Builder, By } = require('selenium-webdriver');
const fs = require('fs');
const { promisify } = require('util');

const BROWSER_LIST_FILE = 'browsers.json';
const SCREEN_SIZES_FILE = 'screensize.json';
const WEBSITE_DATA_FILE = 'testdata1.json';
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

                for (const testCase of websiteData.test_cases) {
                    log(
                        logFilePath,
                        `Executing test case: ${testCase.test_name}\n`
                    );

                    const element = await driver.findElement(
                        By[testCase.type](testCase.value)
                    );

                    // Find the web element using the specified locator strategy and value

                    for (const assertion of testCase.assertions) {
                        log(
                            logFilePath,
                            `Performing assertion ${assertion.name} on ${testCase.test_name}`
                        );
                        let result;

                        switch (assertion.type) {
                            case 'isVisible':
                                result = await element.isDisplayed();
                                break;
                            // Add other assertion types here
                        }

                        // Perform different types of assertions on the element and record the result

                        if (result !== assertion.expected_value) {
                            const errorMsg = `Assertion failed: ${JSON.stringify(
                                screenSize
                            )}, ${testCase.test_name}, ${
                                assertion.name
                            }\n was expected ${
                                assertion.expected_value
                            } but found ${result}\n`;
                            log(logFilePath, errorMsg);
                        } else {
                            log(
                                logFilePath,
                                `Assertion passed: ${JSON.stringify(
                                    screenSize
                                )}, ${testCase.test_name}, ${assertion.name}\n`
                            );
                        }

                        // Log the assertion result based on whether it passed or failed
                    }

                    for (const locator of testCase.locators) {
                        log(
                            logFilePath,
                            `Locating ${locator.locator_name} using ${locator.type}: ${locator.value}`
                        );
                        const locatorElement = await driver.findElement(
                            By[locator.type](locator.value)
                        );

                        // Find the web element using the specified locator strategy and value

                        for (const assertion of locator.assertions) {
                            log(
                                logFilePath,
                                `Performing assertion ${assertion.name} on ${locator.locator_name}`
                            );
                            let result;

                            switch (assertion.type) {
                                case 'isVisible':
                                    result = await locatorElement.isDisplayed();
                                    break;
                                // Add other assertion types here
                            }

                            // Perform different types of assertions on the element and record the result

                            if (result !== assertion.expected_value) {
                                const errorMsg = `Assertion failed: ${JSON.stringify(
                                    screenSize
                                )}, ${locator.locator_name}, ${
                                    assertion.name
                                }\n was expected ${
                                    assertion.expected_value
                                } but found ${result}\n`;
                                log(logFilePath, errorMsg);
                            } else {
                                log(
                                    logFilePath,
                                    `Assertion passed: ${JSON.stringify(
                                        screenSize
                                    )}, ${locator.locator_name}, ${
                                        assertion.name
                                    }\n`
                                );
                            }

                            // Log the assertion result based on whether it passed or failed
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
