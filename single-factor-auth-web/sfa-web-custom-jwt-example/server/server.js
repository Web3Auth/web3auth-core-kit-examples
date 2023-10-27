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
			  name: "Maharshi Mishra",
			  email: "maharshi@web3auth.io",
			  aud: "urn:my-resource-server", // -> to be used in Custom Authentication as JWT Field
			  iss: "https://my-authz-server", // -> to be used in Custom Authentication as JWT Field
			  iat: Math.floor(Date.now() / 1000),
			  exp: Math.floor(Date.now() / 1000) + 60 * 60,
			},
			privateKey,
			{ algorithm: "RS256", keyid: "676da9d312c39a429932f543e6c1b7812e4983" } // <-- This has to be present in the JWKS endpoint.
		);
		res.status(200).json({ token });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

const listener = app.listen(process.env.PORT || 8080, () =>
	console.log('Listening on port ' + listener.address().port),
);
