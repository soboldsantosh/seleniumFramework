// Import required dependencies
const { Builder, By } = require('selenium-webdriver');
const fs = require('fs');
const { promisify } = require('util');
const takeScreenshot = require('./screenshot');
const { browser: browserList } = require('./browsers.json');
const screenSizes = require('./screensize.json');
const websiteData = require('./testdata1.json');
const baseData = require('./base.json');

// Define the log directory path
const LOG_DIR = 'logs';

// Main function to run the tests
async function runTests() {
  try {
    // Create the log directory if it doesn't exist
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR);
    }

    // Iterate over each browser
    for (const browser of browserList) {
      const browserLogDir = `${LOG_DIR}/${browser.name}`;

      // Create browser-specific log directory if it doesn't exist
      if (!fs.existsSync(browserLogDir)) {
        fs.mkdirSync(browserLogDir);
      }

      // Iterate over each screen size for the website
      for (const screenSize of screenSizes[websiteData.screensizes]) {
        const logFilePath = `${browserLogDir}/${screenSize.width}x${screenSize.height}.log`;
        const logStream = fs.createWriteStream(logFilePath, {
          flags: 'a',
        });

        try {
          // Log browser and screen size
          log(logFilePath, `Running tests for browser: ${browser.name}`);
          log(logFilePath, `Screen size: ${screenSize.width}x${screenSize.height}`);

          // Build the Selenium WebDriver instance for the current browser
          const driver = await new Builder().forBrowser(browser.name).build();
          await driver.manage().window().setRect(screenSize);
          await driver.get(websiteData.url);
          log(logFilePath, `Opened URL: ${websiteData.url}`);

          const cookiePopupLocator = By.id('CybotCookiebotDialog');
          const cookiePopupAccept = By.id('CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');

          // Check if the cookie popup is visible and accept it if necessary
          const isCookiePopupVisible = await isElementVisible(driver, cookiePopupLocator);
          if (isCookiePopupVisible) {
            await driver.findElement(cookiePopupAccept).click();
            log(logFilePath, 'Accepted cookie popup');
          }

          // Iterate over each test case for the website
          for (const testCase of websiteData.test_cases) {
            const element = await driver.findElement(By[testCase.type](testCase.value));
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
            log(logFilePath, `Took screenshot for test case: ${testCase.test_name}`);

            // Iterate over each assertion for the current test case
            for (const assertion of testCase.assertions) {
              await performAssertion(
                assertion.type,
                element,
                assertion.expected_value,
                testCase.test_name,
                logFilePath,
                screenSize,
                testCase.test_name,
                assertion.name
              );
              log(logFilePath, `Performed assertion: ${assertion.name}`);
            }

            // Iterate over each locator within the current test case
            for (const locator of testCase.locators) {
              const locatorElement = await locateElement(
                driver,
                locator.type,
                locator.value,
                locator.locator_name,
                logFilePath
              );

              // Iterate over each assertion for the current locator
              for (const assertion of locator.assertions) {
                await performAssertion(
                  assertion.type,
                  locatorElement,
                  assertion.expected_value,
                  locator.locator_name,
                  logFilePath,
                  assertion.property,
                  screenSize,
                  assertion.name
                );
                log(logFilePath, `Performed assertion: ${assertion.name}`);
              }
            }
          }

          // Quit the browser instance after the test case execution
          await driver.quit();
          log(logFilePath, 'Browser instance closed');
        } catch (err) {
          // Log any errors that occur during test execution
          log(logFilePath, `ERROR: ${JSON.stringify(screenSize)}, ${err}\n`);
        }
      }
    }
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

// Function to log a message to console and file
function log(logFilePath, message) {
  console.log(message);
  fs.appendFileSync(logFilePath, `${message}\n`);
}

// Function to check if an element is visible on the page
async function isElementVisible(driver, locator) {
  try {
    const element = await driver.findElement(locator);
    return await element.isDisplayed();
  } catch (error) {
    return false;
  }
}

// // Function to take a screenshot (implementation not provided)
// async function takeScreenshot(browser, websiteData, driver, logFilePath, screenSize, testCase, element) {
//   // Implement the logic for taking a screenshot
// }

// Function to locate an element on the page
async function locateElement(driver, type, value, locatorName, logFilePath) {
  let locatorElement;

  try {
    locatorElement = await driver.findElement(By[type](value));
  } catch (error) {
    // Add a random sleep time before retrying to locate the element
    await driver.sleep(Math.floor(Math.random() * 1000) + 3000);
    locatorElement = await driver.findElement(By[type](value));
  }

  return locatorElement;
}

// Function to perform an assertion on an element
async function performAssertion(type, element, expectedValue, testName, logFilePath, property, screenSize, locatorName) {
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
        const res = baseCssProperty === baseValues[key];
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

  // Log the assertion result
  if (result !== true && type !== 'checkBase') {
    log(
      logFilePath,
      `Assertion failed: ${JSON.stringify(screenSize)}, ${testName}, ${locatorName}, ${type}\n was expected ${expectedValue} ${errMsg}`
    );
  }
  if (result === true && type !== 'checkBase') {
    log(
      logFilePath,
      `Assertion passed: ${JSON.stringify(screenSize)}, ${testName}, ${locatorName}, ${type}\n`
    );
  }
}

// Run the tests
runTests();
