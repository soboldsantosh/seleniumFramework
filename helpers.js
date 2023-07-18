// testUtils.js
const { By } = require('selenium-webdriver');
const fs = require('fs');
const baseData = require('./base.json');
const websiteData = require('./testdata1.json');
// Function to check if an element is visible on the page
async function isElementVisible(driver, locator) {
  try {
    const element = await driver.findElement(locator);
    return await element.isDisplayed();
  } catch (error) {
    return false;
  }
}

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

function log(logFilePath, message) {
    console.log(message);
    fs.appendFileSync(logFilePath, `${message}\n`);
  }

module.exports = {
  isElementVisible,
  locateElement,
  performAssertion
};
