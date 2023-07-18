const { Builder, By, until } = require('selenium-webdriver');
const { ExpectedConditions } = require('selenium-webdriver/lib/webdriver');
const fs = require('fs');
const { promisify } = require('util');
const takeScreenshot = require('./screenshot');

const BROWSER_LIST_FILE = 'browsers.json';
const SCREEN_SIZES_FILE = 'screensize.json';
const WEBSITE_DATA_FILE = 'testdata1.json';
const BASE_DATA = 'base.json';
const LOG_DIR = 'logs';

// Import necessary modules and define constant variables

async function runTests() {
    // Asynchronous function to run tests

    const browserList = require(`./${BROWSER_LIST_FILE}`).browser;
    const screenSizes = require(`./${SCREEN_SIZES_FILE}`);
    const websiteData = require(`./${WEBSITE_DATA_FILE}`);
    const baseData = require(`./${BASE_DATA}`);

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

                await driver.manage().window().setRect(screenSize);
                log(
                    logFilePath,
                    `Navigating to ${websiteData.url} in ${
                        browser.name
                    } with window size ${JSON.stringify(screenSize)}\n`
                );
                await driver.get(websiteData.url);

                // Accept cookies if the cookie popup is present
                const cookiePopupLocator = By.id('CybotCookiebotDialog');
                const cookiePopupAccept = By.id(
                    'CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'
                );
                const isCookiePopupVisible = await isElementVisible(
                    driver,
                    cookiePopupLocator
                );
                if (isCookiePopupVisible) {
                    log(
                        logFilePath,
                        `Cookie popup detected. Accepting cookies.`
                    );
                    await driver.findElement(cookiePopupAccept).click();
                }

                // Set the window size, navigate to the website, and log the details

                for (const testCase of websiteData.test_cases) {
                    log(
                        logFilePath,
                        `Executing test case: ${testCase.test_name}\n`
                    );

                    const element = await driver.findElement(
                        By[testCase.type](testCase.value)
                    );

                    // Scroll to the test case block and position it at the top with a little space
                    await driver.executeScript(
                        'arguments[0].scrollIntoView({ block: "start", inline: "nearest" });',
                        element
                    );

                    // Wait for a small delay to allow the page to settle
                    await driver.sleep(1000);

                    // Take a screenshot of the element if the screenshot file doesn't exist
                    log(
                        logFilePath,
                        `Taking screenshot of ${testCase.test_name}`
                    );
                    await takeScreenshot(
                        browser,
                        websiteData,
                        driver,
                        logFilePath,
                        screenSize,
                        testCase,
                        element
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
                        // driver.sleep(3000);
                        // const locatorElement = await driver.findElement(
                        //     By[locator.type](locator.value)
                        // );

                        let locatorElement;

                        try {
                            locatorElement = await driver.findElement(
                                By[locator.type](locator.value)
                            );
                        } catch (error) {
                            // Wait for 3-4 seconds before throwing an error
                            await driver.sleep(
                                Math.floor(Math.random() * 1000) + 3000
                            );

                            // Attempt to locate the element again
                            locatorElement = await driver.findElement(
                                By[locator.type](locator.value)
                            );
                        }

                        // Find the web element using the specified locator strategy and value

                        for (const assertion of locator.assertions) {
                            log(
                                logFilePath,
                                `Performing assertion ${assertion.name} on ${locator.locator_name}`
                            );
                            let result;
                            let errMsg;

                            switch (assertion.type) {
                                case 'isVisible':
                                    result = await locatorElement.isDisplayed();
                                    errMsg = ` but found ${result}\n`;
                                    break;
                                case 'checkClassName':
                                    const className =
                                        await locatorElement.getAttribute(
                                            'class'
                                        );
                                    result = className.includes(
                                        assertion.expected_value
                                    );
                                    errMsg = ` but found className: ${className}\n`;
                                    break;
                                case 'checkCSSProperty':
                                    const cssProperty =
                                        await locatorElement.getCssValue(
                                            assertion.property
                                        );
                                    result =
                                        cssProperty ===
                                        assertion.expected_value;
                                    errMsg = ` but found ${assertion.property}: ${cssProperty}\n`;
                                    break;
                                case 'checkBase':
                                    const baseClass = assertion.expected_value;
                                    // console.log(baseClass);
                                    const baseRecords =
                                        baseData[websiteData.screensizes];
                                    const baseValues =
                                        baseRecords[0][baseClass];

                                    for (const key in baseValues) {
                                        if (baseValues.hasOwnProperty(key)) {
                                            const value = baseValues[key];
                                            // console.log(`${key}: ${value}`);
                                            const baseCssProperty =
                                                await locatorElement.getCssValue(
                                                    key
                                                );
                                            result =
                                                baseCssProperty ===
                                                baseValues[key];
                                            errMsg = ` but found ${key}: ${baseCssProperty}\n`;
                                        }
                                        if (result !== true) {
                                            const errorMsg = `Assertion failed: ${JSON.stringify(
                                                screenSize
                                            )}, ${locator.locator_name}, ${
                                                assertion.name
                                            }\n was expected ${
                                                assertion.expected_value
                                            } ${errMsg}`;

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
                                    }
                                    break;

                                // Add other assertion types here
                            }

                            // Perform different types of assertions on the element and record the result

                            if (result !== true) {
                                const errorMsg = `Assertion failed: ${JSON.stringify(
                                    screenSize
                                )}, ${locator.locator_name}, ${
                                    assertion.name
                                }\n was expected ${
                                    assertion.expected_value
                                } ${errMsg}`;

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

async function isElementVisible(driver, locator) {
    try {
        const element = await driver.findElement(locator);
        return await element.isDisplayed();
    } catch (error) {
        return false;
    }
}
// Utility function to log messages to the console and append them to a log file

runTests();
// Execute the test suite
