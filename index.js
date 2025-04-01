require('dotenv').config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { GoogleAuth } = require("google-auth-library");

const PORT = process.env.PORT || 3000;
const base64Credentials = process.env.GOOGLE_CREDENTIALS_JSON;

if (!base64Credentials) {
    console.error("Error: GOOGLE_CREDENTIALS_JSON is not set.");
    process.exit(1);
}

const credentialsJson = JSON.parse(Buffer.from(base64Credentials, 'base64').toString('utf8'));

async function authenticateGoogleSheet() {
    const creds = credentialsJson;
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    const auth = new GoogleAuth({
        credentials: creds,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const authClient = await auth.getClient();
    await doc.useServiceAccountAuth(authClient);
    await doc.loadInfo();
    console.log("Google Sheet Title:", doc.title);
    
    return doc;
}

async function addTransactionToSheet(transaction, doc) {
    try {
        const sheet = doc.sheetsByIndex[0]; // Select first sheet
        await sheet.addRow({
            TransactionID: transaction.transactionID,
            PlayerID: transaction.playerID,
            ServerID: transaction.serverID,
            Amount: transaction.amount,
            Status: transaction.status,
            Timestamp: new Date().toISOString(),
        });

        console.log("Transaction saved to Google Sheet.");
    } catch (error) {
        console.error("Error saving transaction to sheet:", error);
    }
}

app.use(bodyParser.json());
app.use(cors());

app.post("/submit-transaction", async (req, res) => {
    const { transactionID, playerID, serverID, amount } = req.body;

    if (!transactionID || !playerID || !serverID || !amount) {
        return res.status(400).json({ message: "Missing required fields", success: false });
    }

    if (transactions.has(transactionID)) {
        return res.status(400).json({ message: "Duplicate transaction", success: false });
    }

    const transaction = { transactionID, playerID, serverID, amount, status: "Pending" };
    transactions.set(transactionID, transaction);

    try {
        const doc = await authenticateGoogleSheet(); // Get the authenticated sheet
        await addTransactionToSheet(transaction, doc); // Pass `doc` to the function
        res.status(200).json({ message: "Transaction submitted for verification", success: true });
    } catch (error) {
        console.error("Error in transaction submission:", error);
        res.status(500).json({ message: "Error saving transaction", success: false });
    }
});
app.get("/", (req, res) => {
    res.send("Server is running!");
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

