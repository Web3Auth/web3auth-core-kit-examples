import React, { useState } from "react";
import {QRCodeSVG} from "qrcode.react";
import { COREKIT_STATUS, generateFactorKey, IFactorManagerContext, ISignerContext, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { AuthenticatorFactorManager, getFactorDetailsAndDescriptions, MPCRemoteSignerPlugin } from "@web3auth/mpc-remote-signer-plugin";

export const RemoteSignerFeature = (params:{coreKitInstance: Web3AuthMPCCoreKit, authenticatorService?: AuthenticatorFactorManager<IFactorManagerContext>}) => {
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

    const removeAuthenticator = async (force: boolean = false) => {
        if (!coreKitInstance || !authenticatorService) {
        throw new Error("coreKitInstance not found");
        }
        await authenticatorService.unregisterFactor(force);
    }

    const verifyRegistration = async ( code : string) => {
        if (!coreKitInstance || !authenticatorService) {
        throw new Error("coreKitInstance not found");
        }

        const factorkey = generateFactorKey();
        await authenticatorService.verifyRegistration( code, factorkey.private.toString("hex") );
        await coreKitInstance.commitChanges();
        // once authenticated, initiate the remote signer plugin
        const remoteSignerPlugin = new MPCRemoteSignerPlugin({
            remoteServerUrl: authenticatorService.remoteServerUrl,
            remoteClientToken: authenticatorService.remoteClientToken,
            remoteFactor: authenticatorService.remoteFactor
        },coreKitInstance as ISignerContext);
        debugger
        await remoteSignerPlugin.init();
        setShowQrCode(false);
    }


    const QRCodeRegisterView = () => {
        const copyToClipboard = () => {
            navigator.clipboard.writeText(qrCodeSVG);
        };

        return <div id="qrcode" style={{ textAlign: "center" , position:"absolute" }} >
            <QRCodeSVG value={qrCodeSVG} size={300} />
            <div>
                <span>{qrCodeSVG}</span>
                <button onClick={copyToClipboard}>Copy</button>
            </div>
            <input type="text" value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
            <button onClick={() => verifyRegistration(otpValue)} >Verify</button>
        </div>;
    };

    return <div>
        { showQrCode && <QRCodeRegisterView />}
        <button onClick={startRegistration} className="card">
          Register Authenticator
        </button>
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={()=>removeAuthenticator(false)} className="card">
          Delete Authenticator
        </button>

        <button onClick={()=>removeAuthenticator(true)} className="card">
          Force Delete Authenticator
        </button>
    </div>
}

export const TOTPRemoteSignerLoginView = (params:{coreKitInstance: Web3AuthMPCCoreKit, authenticatorService?: AuthenticatorFactorManager<IFactorManagerContext> , successCallback: (status: COREKIT_STATUS) => void}) => {
    const {coreKitInstance, authenticatorService, successCallback} = params;
    const [otpValue, setOtpValue] = useState<string>("");
    const remoteSetup = async (code : string) => {
        if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
        }

        if (!authenticatorService) {
            throw new Error("authenticatorService not found");
        }

    

        const details = coreKitInstance.getKeyDetails();
        const {factorPub} = getFactorDetailsAndDescriptions( details.shareDescriptions, "authenticator")

        // to do add more security measure
        await authenticatorService.authenticate( code )

        // once authenticated, initiate the remote signer plugin
        const remoteSignerPlugin = new MPCRemoteSignerPlugin({
            remoteServerUrl: authenticatorService.remoteServerUrl,
            remoteClientToken: authenticatorService.remoteClientToken,
            remoteFactor: authenticatorService.remoteFactor
        },coreKitInstance as ISignerContext);
        await remoteSignerPlugin.init();
        successCallback(coreKitInstance.status);
    }
    return <div>
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={() => remoteSetup(otpValue)} >Setup</button>
    </div>
}

