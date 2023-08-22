const fs = require('fs');

async function takeScreenshot(browser, websiteData, driver, logFilePath, screenSize, locator, element) {
    const screenshotDir = `./screenshots/${browser.name}/${websiteData.screensizes}`;
    fs.mkdirSync(screenshotDir, { recursive: true });

    const elementHash = `${screenSize.width}x${screenSize.height}-${locator.testName}`;
    const screenshotFile = `${screenshotDir}/${elementHash}.png`;

    if (!fs.existsSync(screenshotFile)) {
        // log(logFilePath, `Taking screenshot of ${locator.testName}`);
        await driver.executeScript(
            "arguments[0].scrollIntoView(true)",
            element
        );
        const data = await driver.takeScreenshot();
        fs.writeFileSync(screenshotFile, data, "base64");
    }
}

module.exports = takeScreenshot;
