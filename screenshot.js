const fs = require('fs');
const selenium = require('selenium-webdriver');

 async function takeScreenshot(
    browser,
    websiteData,
    driver,
    logFilePath,
    screenSize,
    testCase,
    element,
    topSpace = 20, // Extra space at the top of the element
    bottomSpace = 20 // Extra space at the bottom of the element
) {
    // Create a screenshot directory for the specific browser and screen size if it doesn't exist
    const screenshotDir = `./screenshots/${browser.name}/${websiteData.screensizes}`;
    fs.mkdirSync(screenshotDir, { recursive: true });
    const elementHash = `${screenSize.width}x${screenSize.height}-${testCase.test_name}`;
    const screenshotFile = `${screenshotDir}/${elementHash}.png`;
    if (!fs.existsSync(screenshotFile)) {
        await driver.executeScript(
            (element, topSpace, bottomSpace) => {
                // Scroll the element into view
                element.scrollIntoView();
                // Adjust the scroll position to include the extra space
                const rect = element.getBoundingClientRect();
                const top = rect.top - topSpace;
                const bottom = rect.bottom + bottomSpace;
                window.scrollTo(0, top);
                window.scrollTo(0, bottom);
            },
            element,
            topSpace,
            bottomSpace
        );
        const data = await driver.takeScreenshot();
        fs.writeFileSync(screenshotFile, data, 'base64');
    }
}

module.exports = takeScreenshot;
