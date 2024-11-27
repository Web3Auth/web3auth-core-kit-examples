import React, { useState } from "react";
import {QRCodeSVG} from "qrcode.react";
import { COREKIT_STATUS, generateFactorKey, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { AuthenticatorService, getFactorDetailsAndDescriptions } from "@web3auth/mpc-remote-signer-plugin";




export const RemoteSignerFeature = (params:{coreKitInstance: Web3AuthMPCCoreKit, authenticatorService?: AuthenticatorService<Web3AuthMPCCoreKit>}) => {
    const {coreKitInstance, authenticatorService} = params;
    const [showQrCode, setShowQrCode] = useState(false);
    const [qrCodeSVG, setQrCodeSVG] = useState<string>("");
    const [otpValue, setOtpValue] = useState<string>("");

    // Remote Sign
    const startRegistration = async () => {
        if (!coreKitInstance || !authenticatorService) {
        throw new Error("coreKitInstance not found");
        }
        const result = await authenticatorService.startRegisterFactor()

        console.log(result);
        // qrcode
        
        setQrCodeSVG(result.secretKey);
        setShowQrCode(true);
    };

    const removeAuthenticator = async () => {
        if (!coreKitInstance || !authenticatorService) {
        throw new Error("coreKitInstance not found");
        }
        await authenticatorService.unregisterFactor();
    }

    const verifyRegistration = async ( code : string) => {
        if (!coreKitInstance || !authenticatorService) {
        throw new Error("coreKitInstance not found");
        }

        const factorkey = generateFactorKey();
        await authenticatorService.verifyRegistration( code, factorkey.private.toString("hex") );
        await coreKitInstance.commitChanges();
        setShowQrCode(false);
    }


    const QRCodeRegisterView = () => {
        return <div id="qrcode" style={{ textAlign: "center" , position:"absolute" }} >
            <QRCodeSVG value={qrCodeSVG} size={300} />
            <span>{qrCodeSVG}</span>
            <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
            <button onClick={() => verifyRegistration(otpValue)} >Verify</button>
        </div>;
    };

    return <div>
        { showQrCode && <QRCodeRegisterView />}
        <button onClick={startRegistration} className="card">
          Register Authenticator
        </button>
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={removeAuthenticator} className="card">
          Delete Authenticator
        </button>
    </div>
}

export const RemoteSignerLoginView = (params:{coreKitInstance: Web3AuthMPCCoreKit, authenticatorService?: AuthenticatorService<Web3AuthMPCCoreKit> , successCallback: (status: COREKIT_STATUS) => void}) => {
    const {coreKitInstance, authenticatorService, successCallback} = params;
    const [otpValue, setOtpValue] = useState<string>("");
    const remoteSetup = async (code : string) => {
        if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
        }

        const details = coreKitInstance.getKeyDetails();
        const {factorPub} = getFactorDetailsAndDescriptions( details.shareDescriptions, "authenticator")

        // to do add more security measure
        const updated = await authenticatorService?.setupRemoteSignerUsingAuthenticatorCode( code )

        successCallback(coreKitInstance.status);
    }
    return <div>
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={() => remoteSetup(otpValue)} >Setup</button>
    </div>
}

