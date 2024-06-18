require('dotenv').config(); // enables loading .env vars
const jwt = require('jsonwebtoken');
const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');

// Allow requests from client-side
app.use(cors({ origin: 'http://localhost:3000' }));

app.post('/api/token', async (req, res) => {
	try {
		var privateKey = fs.readFileSync('privateKey.pem');
		var token = jwt.sign(
			{
				sub: "faj2720i2fdG7NsqznOKrthDvq43", // must be unique to each user
			  	name: 'Agrawal Alam Mishra Rawski Bherwani',
			  	email: 'devrel@web3auth.io',
			  	aud: 'urn:api-web3auth-io',
			  	iss: 'https://web3auth.io',
			  	iat: Math.floor(Date.now() / 1000),
			  	exp: Math.floor(Date.now() / 1000) + 60 * 60,
			},
			privateKey,
			{ algorithm: 'RS256', keyid: '46f2304094436dd932ab5e' },
		);
		res.status(200).json({ token });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

const listener = app.listen(process.env.PORT || 8080, () =>
	console.log('Listening on port ' + listener.address().port),
);
