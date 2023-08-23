// Import required dependencies
const { Builder, By } = require('selenium-webdriver'); // Import the necessary dependencies from 'selenium-webdriver'
const fs = require('fs'); // Import the file system module
const { promisify } = require('util'); // Import the 'promisify' function from the 'util' module
const takeScreenshot = require('./screenshot'); // Import the takeScreenshot function from 'screenshot.js'
const { browser: browserList } = require('./browsers.json'); // Import the browserList from 'browsers.json'
const screenSizes = require('./screensize.json'); // Import the screenSizes from 'screensize.json'
const websiteData = require('./testdata1.json'); // Import the websiteData from 'testdata1.json'
const baseData = require('./base.json'); // Import the baseData from 'base.json'
const { isElementVisible, locateElement, performAssertion } = require('./helpers'); // Import helper functions from 'helpers.js'

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

          for (const screenSizeGroup of websiteData.screensizes) {
              console.log(screenSizeGroup);

              // Iterate over each screen size for the website
              for (const screenSize of screenSizes[screenSizeGroup]) {
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

                      const cookiePopupLocator = By.id('CybotCookiebotDialogBody');
                      const cookiePopupAccept = By.id('CybotCookiebotDialogBodyButtonAccept');

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
                              //   log(logFilePath, `Performed assertion: ${assertion.name}`);
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
                                      assertion.name,
                                      screenSizeGroup
                                  );
                                  // log(logFilePath, `Performed assertion: ${assertion.name}`);
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

// Export the runTests function as the entry point for running the tests
module.exports = runTests;
