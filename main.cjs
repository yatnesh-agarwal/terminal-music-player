const { app, BrowserWindow } = require("electron");

const APP_URL = "http://127.0.0.1:4176/";

function createWindow() {
    console.log("hello fro main")
    const win = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            contextIsolation: true,
        },
    });

    win.loadURL(APP_URL);
     win.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
