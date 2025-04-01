require('dotenv').config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { GoogleAuth } = require("google-auth-library");
const creds = require("./google-credentials.json");

const PORT = process.env.PORT || 3000;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

app.use(bodyParser.json());
app.use(cors());

let transactions = new Map();

async function addTransactionToSheet(transaction) {
    try {
        if (!GOOGLE_SHEET_ID) throw new Error("Google Sheet ID is missing");

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);

        // Use the GoogleAuth library to authenticate
        const auth = new GoogleAuth({
            credentials: creds,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const authClient = await auth.getClient();
        doc.auth = authClient;

        await doc.loadInfo(); // Loads document properties and worksheets

        const sheet = doc.sheetsByIndex[0]; // Selects the first sheet

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
        await addTransactionToSheet(transaction);
        res.status(200).json({ message: "Transaction submitted for verification", success: true });
    } catch (error) {
        res.status(500).json({ message: "Error saving transaction", success: false });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
