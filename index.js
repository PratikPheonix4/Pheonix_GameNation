require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library"); // Use JWT for authentication
const creds = require("./google-credentials.json");

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

app.use(bodyParser.json());
app.use(cors());

let transactions = new Map(); // Using a Map instead of an array for faster lookups

// Use a function to authenticate with Google Sheets
async function authenticateGoogleSheets() {
    const auth = new JWT({
        email: creds.client_email, // Service account email
        key: creds.private_key,    // Private key from Google service account credentials
        scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Scopes for Google Sheets API
    });

    return auth;
}

// Function to add a transaction to Google Sheets
async function addTransactionToSheet(transaction) {
    try {
        if (!GOOGLE_SHEET_ID) throw new Error("Google Sheet ID is missing");

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);
        
        // Authenticate using the JWT client
        const auth = await authenticateGoogleSheets();
        await doc.useOAuth2Client(auth); // Using OAuth2 client for access

        await doc.loadInfo(); // Load the document information
        const sheet = doc.sheetsByIndex[0]; // Assuming the first sheet
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

app.get("/order/:transactionID", (req, res) => {
    const transaction = transactions.get(req.params.transactionID);
    if (transaction) {
        res.json(transaction);
    } else {
        res.status(404).json({ message: "Transaction not found" });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
