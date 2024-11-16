const { generateKeyPair, exportJWK, exportPKCS8, exportSPKI } = require('jose');
const { writeFileSync } = require('fs');
const path = require('path');
const crypto = require('crypto');

async function createJWKS() {
    try {

        const { publicKey, privateKey } = await generateKeyPair('PS256', {
            modulusLength: 2048, // Standard RSA key size
        });


        const publicKeyPEM = await exportSPKI(publicKey);
        const privateKeyPEM = await exportPKCS8(privateKey);

        const publicKeyPath = path.join(__dirname, 'publicKey.pem');
        const privateKeyPath = path.join(__dirname, 'privateKey.pem');
        writeFileSync(publicKeyPath, publicKeyPEM, 'utf-8');
        writeFileSync(privateKeyPath, privateKeyPEM, 'utf-8');

        console.log(`Public key saved to: ${publicKeyPath}`);
        console.log(`Private key saved to: ${privateKeyPath}`);


        const publicJWK = await exportJWK(publicKey);

        const jwks = {
            alg: 'RS256',            // Algorithm intended for this key
            e: publicJWK.e,          // Public exponent
            ext: true,               // Extension allowed
            kid: crypto.randomBytes(10).toString('hex'), // Generate a unique Key ID
            kty: publicJWK.kty,      // Key type (RSA)
            n: publicJWK.n,          // Public key modulus
            use: 'sig',              // Key intended for signing
        };

        console.log(jwks)

        const jwksFilePath = path.join(__dirname, 'jwks.json');
        writeFileSync(jwksFilePath, JSON.stringify(jwks, null, 2), 'utf-8');

        console.log(`JWKS file created at: ${jwksFilePath}`);
    } catch (error) {
        console.error('Error creating JWKS:', error.message);
    }
}

// Run the script
createJWKS();