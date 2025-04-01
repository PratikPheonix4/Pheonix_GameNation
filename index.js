require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("./google-credentials.json");

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

app.use(bodyParser.json());
app.use(cors());

let transactions = new Map(); // Using a Map instead of an array for faster lookups

async function addTransactionToSheet(transaction) {
    try {
        if (!GOOGLE_SHEET_ID) throw new Error("Google Sheet ID is missing");
        
        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo();
        
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
            TransactionID: transaction.transactionID,
            PlayerID: transaction.playerID,
            ServerID: transaction.serverID,
            Amount: transaction.amount,
            Status: transaction.status,
            Timestamp: new Date().toISOString()
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

// Endpoint to fetch order details
app.get("/order/:transactionID", (req, res) => {
    const transaction = transactions.get(req.params.transactionID);
    if (transaction) {
        res.json(transaction);
    } else {
        res.status(404).json({ message: "Transaction not found" });
    }
});

app.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Check Order</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background-color: #222;
                    color: white;
                }
                .order-box {
                    background: rgba(26, 26, 26, 0.9);
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                input {
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    background: #333;
                    color: white;
                    text-align: center;
                }
                button {
                    background: #FFD700;
                    color: black;
                    font-weight: bold;
                    cursor: pointer;
                    transition: 0.3s;
                    border: none;
                    padding: 6px 10px;
                    border-radius: 4px;
                }
                button:hover {
                    background: #FFC107;
                }
                p {
                    font-size: 14px;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="order-box">
                <input type="text" id="transactionID" placeholder="Enter Transaction ID">
                <button onclick="checkOrder()">Check Order</button>
                <p id="orderResult"></p>
            </div>
            <script>
                function checkOrder() {
                    const transactionID = document.getElementById("transactionID").value;
                    fetch(\`/order/\${transactionID}\`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.message) {
                                document.getElementById("orderResult").textContent = data.message;
                            } else {
                                document.getElementById("orderResult").textContent = \`Player ID: \${data.playerID}, Status: \${data.status}\`;
                            }
                        })
                        .catch(error => console.error("Error fetching order:", error));
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
