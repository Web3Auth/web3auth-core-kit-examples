import tssLib from "@toruslabs/tss-dkls-lib";
import { log } from "@web3auth/base";
import { COREKIT_STATUS, mnemonicToKey, WEB3AUTH_NETWORK_TYPE, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit";
import { useEffect, useState } from "react";
import { isHex } from "viem";

export const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  status: {
    padding: "10px",
    marginBottom: "20px",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
    color: "#333",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "16px",
    transition: "border-color 0.2s",
    "&:focus": {
      outline: "none",
      borderColor: "#0364ff",
    },
  },
  button: {
    backgroundColor: "#0364ff",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#0251cc",
    },
    "&:disabled": {
      backgroundColor: "#ccc",
      cursor: "not-allowed",
    },
  },
  result: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "8px",
    backgroundColor: "#e8f0fe",
    color: "#0364ff",
    wordBreak: "break-all" as const,
  },
};

export const OffNetworkRecovery = (props: { web3AuthClientId: string; web3AuthNetwork: WEB3AUTH_NETWORK_TYPE }) => {
  const { web3AuthClientId, web3AuthNetwork } = props;
  const [coreKitInstance, setCorekitInstance] = useState<Web3AuthMPCCoreKit>();
  const [coreKitStatus, setCoreKitStatus] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const localCoreKitInstance = new Web3AuthMPCCoreKit({
      web3AuthClientId,
      web3AuthNetwork,
      tssLib: tssLib,
      storage: localStorage, // Add the storage property
    });

    localCoreKitInstance
      .init()
      .then(() => {
        setCorekitInstance(localCoreKitInstance);
        setCoreKitStatus(localCoreKitInstance.status);
      })
      .catch((error) => {
        log.error(error);
        setCoreKitStatus("Initializaion error");
      });
  }, []);

  const [deviceFactor, setDeviceFactor] = useState("");
  const [recoveryFactor, setRecoveryFactor] = useState("");

  const [result, setResult] = useState<string>();

  function isHexString(value: string): boolean {
    return /^(0x)?[0-9a-fA-F]+$/.test(value);
  }
  const recoverTss = async () => {
    log.info("Recovering TSS...");
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    if (!deviceFactor || !recoveryFactor) {
      throw new Error("deviceFactor or recoveryFactor is not set");
    }
    log.info(deviceFactor, recoveryFactor);
    try {
      let factorKey = deviceFactor.trim();
      if (!isHexString(factorKey)) {
        factorKey = mnemonicToKey(factorKey);
      }
      let factorKey2 = recoveryFactor.trim();
      if (!isHexString(factorKey2)) {
        factorKey2 = mnemonicToKey(factorKey2);
      }

      console.log("factorKey1: ", factorKey);
      console.log("factorKey2: ", factorKey2);
      setLoading(true);
      const result = await coreKitInstance._UNSAFE_recoverTssKey([factorKey, factorKey2]);
      console.log("Recovered result: ", result);
      setResult(result);
    } catch (e) {
      console.log(e);
      console.log("error");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.status}>Status: {coreKitStatus ?? "Initializating"}</div>
      {coreKitStatus && coreKitStatus !== COREKIT_STATUS.NOT_INITIALIZED && (
        <>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Key In Device Factor</label>
            <input style={styles.input} onChange={(e) => setDeviceFactor(e.target.value)} value={deviceFactor} placeholder="Enter device factor" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Key In Recovery Factor</label>
            <input
              style={styles.input}
              onChange={(e) => setRecoveryFactor(e.target.value)}
              value={recoveryFactor}
              placeholder="Enter recovery factor"
            />
          </div>
          <button style={styles.button} disabled={coreKitStatus !== COREKIT_STATUS.INITIALIZED || loading} onClick={() => recoverTss()}>
            {loading ? "Recovering..." : "Recover TSS"}
          </button>
          {result && <div style={styles.result}>Recovered result: {result}</div>}
        </>
      )}
    </div>
  );
};
