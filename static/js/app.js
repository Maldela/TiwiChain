document.addEventListener('DOMContentLoaded', function() {
    const chainDiv = document.getElementById('chain');
    const messagesDiv = document.getElementById('messages');
    const nodesDiv = document.getElementById('nodes'); // Add this line

    const EC = elliptic.ec;
    const ec = new EC('secp256k1');

    const generateKeysButton = document.getElementById('generate-keys');
    const publicKeyTextArea = document.getElementById('public-key');
    const privateKeyTextArea = document.getElementById('private-key');

    generateKeysButton.addEventListener('click', function() {
        const keyPair = ec.genKeyPair();

        const publicKey = keyPair.getPublic('hex');
        const privateKey = keyPair.getPrivate('hex');

        publicKeyTextArea.value = publicKey;
        privateKeyTextArea.value = privateKey;

        // Store keys in localStorage (use with caution)
        localStorage.setItem('publicKey', publicKey);
        localStorage.setItem('privateKey', privateKey);
    });

    // Load keys from localStorage if they exist
    if (localStorage.getItem('publicKey') && localStorage.getItem('privateKey')) {
        publicKeyTextArea.value = localStorage.getItem('publicKey');
        privateKeyTextArea.value = localStorage.getItem('privateKey');
    }

    // Function to fetch and display the node list
    function fetchNodes() {
        fetch('/nodes')
            .then(response => response.json())
            .then(data => {
                nodesDiv.innerHTML = '';

                if (data.nodes && data.nodes.length > 0) {
                    const nodeList = document.createElement('ul');

                    data.nodes.forEach(node => {
                        const nodeItem = document.createElement('li');
                        nodeItem.textContent = node;
                        nodeList.appendChild(nodeItem);
                    });

                    nodesDiv.appendChild(nodeList);
                } else {
                    nodesDiv.textContent = 'No nodes registered.';
                }
            })
            .catch(error => {
                console.error('Error fetching nodes:', error);
                nodesDiv.textContent = 'Error fetching node list.';
            });
    }

    // Function to fetch and display the blockchain
    function fetchChain() {
        fetch('/chain')
            .then(response => response.json())
            .then(data => {
                chainDiv.innerHTML = '';
    
                data.chain.forEach(block => {
                    const blockDiv = document.createElement('div');
                    blockDiv.className = 'block';
    
                    const blockContent = `
                        <h3>Block ${block.index}</h3>
                        <p><strong>Timestamp:</strong> ${new Date(block.timestamp * 1000).toLocaleString()}</p>
                        <p><strong>Previous Hash:</strong> ${block.previous_hash}</p>
                        <p><strong>Proof:</strong> ${block.proof}</p>
                        <p><strong>Transactions:</strong></p>
                        <ul>
                            ${block.transactions.map(tx => `
                                <li>${tx.sender} ➡️ ${tx.recipient}: ${tx.amount}</li>
                            `).join('')}
                        </ul>
                    `;
    
                    blockDiv.innerHTML = blockContent;
                    chainDiv.appendChild(blockDiv);
                });
            })
            .catch(error => {
                console.error('Error fetching chain:', error);
                messagesDiv.textContent = 'Error fetching blockchain data.';
            });
    }


    

    // Fetch the blockchain on page load
    fetchChain();
    fetchNodes();

    // Set up automatic refresh for the blockchain section
    const refreshInterval = 5000; // Refresh every 30 seconds (adjust as needed)
    setInterval(fetchChain, refreshInterval);
    setInterval(fetchNodes, refreshInterval);

    // Handle transaction form submission
    const transactionForm = document.getElementById('transaction-form');
    // Handle transaction form submission
    transactionForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const recipient = document.getElementById('recipient').value.trim();
        const amountValue = document.getElementById('amount').value;
        const amount = parseFloat(amountValue);

        const privateKeyHex = localStorage.getItem('privateKey');
        const publicKeyHex = localStorage.getItem('publicKey');

        if (!privateKeyHex || !publicKeyHex) {
            showMessage('Please generate your key pair first.');
            return;
        }

        const privateKey = ec.keyFromPrivate(privateKeyHex, 'hex');
        const senderPublicKey = publicKeyHex;

        // Create the transaction data to sign
        const txData = {
            sender_public_key: senderPublicKey,
            recipient_public_key: recipient,
            amount: amount
        };

        const txDataString = JSON.stringify(txData);

        // Sign the transaction data
        const hash = sha256(txDataString);
        const signature = privateKey.sign(hash).toDER('hex');

        // Include the signature in the transaction
        txData.signature = signature;

        // Send the transaction to the server
        fetch('/transactions/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(txData)
        })
        .then(response => response.json())
        .then(data => {
            showMessage(data.message);
            transactionForm.reset();
        })
        .catch(error => {
            console.error('Error sending transaction:', error);
            messagesDiv.textContent = 'Error sending transaction.';
        });
    });

    // Helper function to compute SHA-256 hash
    function sha256(message) {
        return sha256Lib.sha256(message);
    }


    // Handle mine block button click
    const mineButton = document.getElementById('mine-block');
    mineButton.addEventListener('click', function() {
        const publicKeyHex = localStorage.getItem('publicKey');
    
        if (!publicKeyHex) {
            showMessage('Please generate your key pair first.');
            return;
        }
    
        fetch('/mine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ miner_public_key: publicKeyHex })
        })
        .then(response => response.json())
        .then(data => {
            showMessage(data.message);
            fetchChain(); // Refresh the blockchain display
        })
        .catch(error => {
            console.error('Error mining block:', error);
            messagesDiv.textContent = 'Error mining block.';
        });
    });    
});
