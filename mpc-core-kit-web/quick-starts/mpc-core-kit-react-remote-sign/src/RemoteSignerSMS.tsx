import { useState } from "react";
import { COREKIT_STATUS, generateFactorKey, IFactorManagerContext, ISignerContext, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { MPCRemoteSignerPlugin, SmsFactorManager } from "@web3auth/mpc-remote-signer-plugin";




export const SMSRemoteSignerFeature = (params:{coreKitInstance: Web3AuthMPCCoreKit, authenticatorService?: SmsFactorManager<IFactorManagerContext>}) => {
    const {coreKitInstance, authenticatorService} = params;
    const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [otpValue, setOtpValue] = useState<string>("");

    // Remote Sign
    const startRegistration = async () => {
        if (!coreKitInstance || !authenticatorService) {
        throw new Error("coreKitInstance not found");
        }
        const result = await authenticatorService.startRegisterFactor(phoneNumber)

        console.log(result);
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
    }

    return <div>
        <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}/>
        <button onClick={startRegistration} className="card">
            Register Phone Number
        </button>
        <br />
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={()=>verifyRegistration(otpValue)} className="card">
          Verify Phone Number
        </button>
        <br />
        <button onClick={removeAuthenticator} className="card">
          Delete Phone Number
        </button>
    </div>
}

export const SMSRemoteSignerLoginView = (params:{coreKitInstance: Web3AuthMPCCoreKit, smsService?: SmsFactorManager<IFactorManagerContext> , successCallback: (status: COREKIT_STATUS) => void}) => {
    const {coreKitInstance, smsService, successCallback} = params;
    const [otpValue, setOtpValue] = useState<string>("");
    const remoteSetup = async (code : string) => {
        if (!coreKitInstance) {
        throw new Error("coreKitInstance not found");
        }

        if (!smsService) {
            throw new Error("smsService not found");
        }

        // to do add more security measure
        await smsService.authenticate( code )
        // once authenticated, initiate the remote signer plugin
        const remoteSignerPlugin = new MPCRemoteSignerPlugin({
            remoteServerUrl: smsService.remoteServerUrl,
            remoteClientToken: smsService.remoteClientToken,
            remoteFactor: smsService.remoteFactor
        },coreKitInstance as ISignerContext);
        await remoteSignerPlugin.init();
        successCallback(coreKitInstance.status);
    }

    const requestOtp = async () => {
        if (!coreKitInstance || !smsService) {
        throw new Error("coreKitInstance not found");
        }
        await smsService.requestSMSOTP()
    }
    return <div>
        <button onClick={()=>requestOtp()} className="card">
            Request OTP
        </button>
        <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)}/>
        <button onClick={() => remoteSetup(otpValue)} className="card" >Setup Remote Signer via OTP</button>
    </div>
}

