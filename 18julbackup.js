const { Builder, By } = require('selenium-webdriver');
const fs = require('fs');
const { promisify } = require('util');
const takeScreenshot = require('./screenshot');
const { browser: browserList } = require(`./browsers.json`);
const screenSizes = require(`./screensize.json`);
const websiteData = require(`./testdata1.json`);
const baseData = require(`./base.json`);

const LOG_DIR = 'logs';

async function runTests() {
    try {
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
                const logStream = fs.createWriteStream(logFilePath, {
                    flags: 'a',
                });

                try {
                    const driver = await new Builder()
                        .forBrowser(browser.name)
                        .build();
                    await driver.manage().window().setRect(screenSize);
                    await driver.get(websiteData.url);

                    const cookiePopupLocator = By.id('CybotCookiebotDialog');
                    const cookiePopupAccept = By.id(
                        'CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'
                    );
                    const isCookiePopupVisible = await isElementVisible(
                        driver,
                        cookiePopupLocator
                    );

                    if (isCookiePopupVisible) {
                        await driver.findElement(cookiePopupAccept).click();
                    }

                    for (const testCase of websiteData.test_cases) {
                        const element = await driver.findElement(
                            By[testCase.type](testCase.value)
                        );
                        await driver.executeScript(
                            'arguments[0].scrollIntoView({ block: "start", inline: "nearest" });',
                            element
                        );
                        await driver.sleep(1000);
                        await takeScreenshot(
                            browser,
                            websiteData,
                            driver,
                            logFilePath,
                            screenSize,
                            testCase,
                            element
                        );

                        for (const assertion of testCase.assertions) {
                            const result = await performAssertion(
                                assertion.type,
                                element,
                                assertion.expected_value,
                                testCase.test_name,
                                logFilePath
                            );
                            log(
                                logFilePath,
                                // result,
                                screenSize,
                                testCase.test_name,
                                assertion.name
                            );
                        }

                        for (const locator of testCase.locators) {
                            const locatorElement = await locateElement(
                                driver,
                                locator.type,
                                locator.value,
                                locator.locator_name,
                                logFilePath
                            );

                            for (const assertion of locator.assertions) {
                                const result = await performAssertion(
                                    assertion.type,
                                    locatorElement,
                                    assertion.expected_value,
                                    locator.locator_name,
                                    logFilePath,
                                    assertion.property,
                                    screenSize,
                                    assertion.name,
                                );
                                log(
                                    logFilePath,
                                    // result,
                                    screenSize,
                                    locator.locator_name,
                                    assertion.name
                                );
                            }
                        }
                    }

                    await driver.quit();
                } catch (err) {
                    log(
                        logFilePath,
                        `ERROR: ${JSON.stringify(screenSize)}, ${err}\n`
                    );
                }
            }
        }
    } catch (err) {
        console.error('An error occurred:', err);
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

// async function takeScreenshot(
//     browser,
//     websiteData,
//     driver,
//     logFilePath,
//     screenSize,
//     testCase,
//     element
// ) {
//     // Implement the logic for taking a screenshot
// }

async function locateElement(driver, type, value, locatorName, logFilePath) {
    let locatorElement;

    try {
        locatorElement = await driver.findElement(By[type](value));
    } catch (error) {
        await driver.sleep(Math.floor(Math.random() * 1000) + 3000);
        locatorElement = await driver.findElement(By[type](value));
    }

    return locatorElement;
}

async function performAssertion(
    type,
    element,
    expectedValue,
    testName,
    logFilePath,
    property,
    screenSize,
    locatorName
) {
    let result, errMsg;

    switch (type) {
        case 'isVisible':
            result = await element.isDisplayed();
            errMsg = ` but found ${result}\n`;
            break;
        case 'checkClassName':
            const className = await element.getAttribute('class');
            result = className.includes(expectedValue);
            errMsg = ` but found className: ${className}\n`;
            break;
        case 'checkCSSProperty':
            const cssProperty = await element.getCssValue(property);
            result = cssProperty === expectedValue;
            errMsg = ` but found ${property}: ${cssProperty}\n`;
            break;
        case 'checkBase':
            const baseClass = expectedValue;
            const baseRecords = baseData[websiteData.screensizes];
            const baseValues = baseRecords[0][baseClass];
            for (const key in baseValues) {
                const value = baseValues[key];
                const baseCssProperty = await element.getCssValue(key);
                res = baseCssProperty === baseValues[key];
                errMsg = ` but found ${key}: ${baseCssProperty}\n`;

                if (res) {
                    console.log(`Assertion passed: ${key}`);
                    log(
                        logFilePath,
                        `Assertion passed: ${JSON.stringify(screenSize)},${testName},  ${locatorName}, ${type}\n ${key} is as expected ${baseValues[key]} `
                    );
                      } else {
                    console.log(`Assertion failed: ${key}`);
                    log(
                        logFilePath,
                        `Assertion failed: ${JSON.stringify(screenSize)},${testName},  ${locatorName}, ${type}\n was expected ${baseValues[key]} ${errMsg}`
                    );
                  }
                }
            break;
    }

    if (result !== true && type !=='checkBase') {
        log(
            logFilePath,
            `Assertion failed: ${JSON.stringify(screenSize)}, ${testName}, ${locatorName}, ${type}\n was expected ${expectedValue} ${errMsg}`
        );
    } if(result == true && type !=='checkBase') {
        log(
            logFilePath,
            `Assertion passed: ${JSON.stringify(screenSize)}, ${testName}, ${locatorName}, ${type}\n`
        );
    }
}

runTests();
