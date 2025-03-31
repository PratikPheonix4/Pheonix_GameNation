// Backend: Node.js + Express
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors()); // CORS enable karte hain frontend ke liye

// Dummy database to store transactions
let transactions = [];

// Endpoint to receive payment success webhook
app.post('/payment-webhook', (req, res) => {
    const { transactionID, playerID, serverID, amount, status } = req.body;
    
    if (status === 'success') {
        transactions.push({ transactionID, playerID, serverID, amount, status });
        console.log(`Payment received for Player ${playerID} on Server ${serverID}, Amount: ₹${amount}`);
        res.status(200).json({ message: 'Payment verified', success: true });
    } else {
        res.status(400).json({ message: 'Payment failed', success: false });
    }
});

// Endpoint to fetch order details
app.get('/order/:transactionID', (req, res) => {
    const transaction = transactions.find(t => t.transactionID === req.params.transactionID);
    if (transaction) {
        res.json(transaction);
    } else {
        res.status(404).json({ message: 'Transaction not found' });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
