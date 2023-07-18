const fs = require('fs');

const README_MARKUP = `
# Automated Tests

This repository contains automated tests written in JavaScript using the Selenium WebDriver.

## Dependencies

- [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver): A JavaScript framework for browser automation.
- [fs](https://nodejs.org/api/fs.html): A Node.js module for file system operations.
- [takeScreenshot](./screenshot.js): A custom module for taking screenshots.
- [browsers.json](./browsers.json): JSON file containing a list of browsers.
- [screensize.json](./screensize.json): JSON file containing screen sizes.
- [testdata1.json](./testdata1.json): JSON file containing website test data.
- [base.json](./base.json): JSON file containing base data.
- [helpers.js](./helpers.js): Helper functions for element visibility, element location, and assertion.

## Usage

To run the tests, follow these steps:

1. Install the required dependencies:

   \`\`\`shell
   npm install selenium-webdriver
   \`\`\`

2. Configure the test data:

   - Modify \`testdata1.json\` with the appropriate test cases and assertions for the website being tested.
   - Update \`browsers.json\` with the desired browsers to run the tests on.
   - Adjust the screen sizes in \`screensize.json\` based on the desired resolutions.

3. Run the tests:

   \`\`\`shell
   node runTests.js
   \`\`\`

## File Structure

- \`runTests.js\`: The main test script that runs the automated tests.
- \`screenshot.js\`: Module for capturing screenshots during test execution.
- \`browsers.json\`: JSON file defining the list of browsers to test.
- \`screensize.json\`: JSON file containing screen sizes.
- \`testdata1.json\`: JSON file containing the test data for the website.
- \`base.json\`: JSON file containing the base data for assertions.
- \`helpers.js\`: Helper functions for element visibility, element location, and assertion.

## Test Execution Flow

1. Create the log directory if it doesn't exist.
2. Iterate over each browser.
   - Create a browser-specific log directory if it doesn't exist.
   - Iterate over each screen size for the website.
     - Create a log file for the current browser and screen size.
     - Set up the WebDriver for the current browser.
     - Open the website URL.
     - Check and accept the cookie popup if necessary.
     - Iterate over each test case for the website.
       - Find the element for the test case.
       - Scroll the element into view.
       - Take a screenshot.
       - Iterate over each assertion for the test case.
         - Perform the assertion on the element.
       - Iterate over each locator for the test case.
         - Find the locator element.
         - Iterate over each assertion for the locator.
           - Perform the assertion on the locator element.
     - Close the browser.
3. Complete the test execution.

## Logging

The \`log\` function is used to log messages to the console and the log file.

## Export

The \`runTests\` function is exported as the entry point for running the tests.
`;

const readmeFilePath = './README.md';
fs.writeFileSync(readmeFilePath, README_MARKUP);

console.log(`README file generated at: ${readmeFilePath}`);
