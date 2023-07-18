const { Builder, By } = require('selenium-webdriver');
const fs = require('fs');
const { promisify } = require('util');
const takeScreenshot = require('./screenshot');
const { browser: browserList } = require('./browsers.json');
const screenSizes = require('./screensize.json');
const websiteData = require('./testdata1.json');
const baseData = require('./base.json');
const { isElementVisible, locateElement, performAssertion } = require('./helpers');



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
          log(logFilePath, `Running tests for browser: ${browser.name}`);
          log(logFilePath, `Screen size: ${screenSize.width}x${screenSize.height}`);

          const driver = await new Builder().forBrowser(browser.name).build();
          await driver.manage().window().setRect(screenSize);
          await driver.get(websiteData.url);
          log(logFilePath, `Opened URL: ${websiteData.url}`);

          const cookiePopupLocator = By.id('CybotCookiebotDialog');
          const cookiePopupAccept = By.id('CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');

          const isCookiePopupVisible = await isElementVisible(driver, cookiePopupLocator);
          if (isCookiePopupVisible) {
            await driver.findElement(cookiePopupAccept).click();
            log(logFilePath, 'Accepted cookie popup');
          }

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

            for (const locator of testCase.locators) {
              const locatorElement = await locateElement(
                driver,
                locator.type,
                locator.value,
                locator.locator_name,
                logFilePath
              );

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

          await driver.quit();
          log(logFilePath, 'Browser instance closed');
        } catch (err) {
          log(logFilePath, `ERROR: ${JSON.stringify(screenSize)}, ${err}\n`);
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

module.exports = runTests;
