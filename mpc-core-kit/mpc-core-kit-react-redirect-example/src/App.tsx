import { useEffect, useState } from "react";
import swal from "sweetalert";
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK } from "@web3auth/mpc-core-kit"
import Web3 from "web3";
import "./App.css";

const uiConsole = (...args: any[]): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};


function App() {
  const [coreKitInstance, setCoreKitInstance] = useState<Web3AuthMPCCoreKit | null>(null);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // Initialization of Service Provider
      try {
        const coreKitInstance = new Web3AuthMPCCoreKit(
          {
            web3AuthClientId: 'BILuyqFCuDXAqVmAuMbD3c4oWEFd7PUENVPyVC-zmsF9euHAvUjqbTCpKw6gO05DBif1YImIVtyaxmEbcLLlb6w',
            web3AuthNetwork: WEB3AUTH_NETWORK.DEVNET,
            uxMode: 'redirect'
          })
        await coreKitInstance.init();
        setCoreKitInstance(coreKitInstance);
        if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      } catch (error) {
        console.error(error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const submitRedirectResult = async () => {
      try {
        const provider = await coreKitInstance?.handleRedirectResult();
        if (provider) setProvider(provider);
      } catch (error) {
        if ((error as Error).message === "required more shares") {
          uiConsole("first triggered", coreKitInstance);
          recoverAccount();
        }
      }
    }
    if (coreKitInstance && window.location.hash.includes("#state")) {
      submitRedirectResult();
    }
  }, [coreKitInstance]);

  const login = async () => {
    if (!coreKitInstance) {
      uiConsole("coreKitInstance not initialized yet");
      return;
    }
    try {
      // Triggering Login using Service Provider ==> opens the popup
      const provider = await coreKitInstance.connect(
        {
          subVerifierDetails: {
            typeOfLogin: 'google',
            verifier: 'google-tkey-w3a',
            clientId:
              '774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com',
          }
        }
      );

      if (provider) setProvider(provider);
    } catch (error) {
      if ((error as Error).message === "required more shares") {
        uiConsole("second triggered", coreKitInstance);
        recoverAccount();
      }
      uiConsole(error);
    }
  };

  const recoverAccount = async () => {
    if (!coreKitInstance) {
      uiConsole("coreKitInstance not initialized yet", coreKitInstance);
      return;
    }
    try {

      swal({
        title: "Please enter your recovery share",
        text: "You can choose between your backup share or your security question share",
        icon: "warning",
        buttons: {
          password: {
            text: "Enter Password",
            value: "password"
          },
          recoveryShare: {
            text: "Enter Recovery Share",
            value: "recoveryShare"
          },
          resetAccount : {
            text: "CRITICAL Reset Account",
            value: "resetAccount"
          },
          cancel: true,
        },
        dangerMode: true,
      })
        .then((value) => {
          switch (value) {
            case "password":
              swal('Enter password (>10 characters)', {
                content: 'input' as any,
              }).then(async value => {
                if (value.length > 10) {
                  resetViaPassword(value);
                } else {
                  swal('Error', 'Password must be >= 11 characters', 'error');
                }
              });
              break;

            case "recoveryShare":
              swal('Enter recovery share', {
                content: 'input' as any,
              }).then(async value => {
                if (value.length > 10) {
                  submitBackupShare(value);
                } else {
                  swal('Error', 'recovery share must be >= 11 characters', 'error');
                }
              });
              break;

              case "resetAccount":
                resetAccount();
                break;

            default:
              swal("Cannot Recover Account");
          }
        });
    } catch (error) {
      uiConsole(error);
    }
  }

  const resetViaPassword = async (password: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    await coreKitInstance.recoverSecurityQuestionShare("What is your password?", password);
    uiConsole('submitted');
    if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
  }

  const submitBackupShare = async (seedPhrase: string): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    await coreKitInstance.inputBackupShare(seedPhrase);
    uiConsole('submitted');
    if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
  }

  const resetAccount = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    await coreKitInstance.CRITICAL_resetAccount();
    uiConsole('reset account successful');
  }

  const exportShare = async (): Promise<void> => {
    if (!provider) {
      throw new Error('provider is not set.');
    }
    const share = await coreKitInstance?.exportBackupShare();
    console.log(share);
    uiConsole(share);
  }

  const newPasswordShare = async () => {
    swal('Enter password (>10 characters)', {
      content: 'input' as any,
    }).then(async value => {
      if (value.length > 10) {
        addSecurityQuestionShare(value);
      } else {
        swal('Error', 'Password must be >= 11 characters', 'error');
      }
    });
  }

  const addSecurityQuestionShare = async (password: string) => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      await coreKitInstance.addSecurityQuestionShare("What is your password?", password);
      uiConsole('saved');
    } catch (err) {
      uiConsole(err);
    }
  }

  const updatePasswordShare = async () => {
    swal('Enter password (>10 characters)', {
      content: 'input' as any,
    }).then(async value => {
      if (value.length > 10) {
        changeSecurityQuestionShare(value);
      } else {
        swal('Error', 'Password must be >= 11 characters', 'error');
      }
    });
  }


  const changeSecurityQuestionShare = async (password: string) => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      await coreKitInstance.changeSecurityQuestionShare("What is your password?", password);
      uiConsole('updated');
    } catch (err) {
      uiConsole(err);
    }
  }

  const deletePasswordShare = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      await coreKitInstance.deleteSecurityQuestionShare("What is your password?");
      uiConsole('deleted');
    } catch (err) {
      uiConsole(err);
    }
  }

  const logout = async () => {
    if (!coreKitInstance) {
      uiConsole("coreKitInstance not initialized yet");
      return;
    }
    uiConsole("Log out");
    await coreKitInstance.logout();
    setProvider(null);
  };

  const getUserInfo = () => {
    const user = coreKitInstance?.getUserInfo();
    uiConsole(user);
  };

  const getKeyDetails = () => {
    const keyDetails = coreKitInstance?.getKeyDetails();
    uiConsole(keyDetails);
  };

  const getChainID = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
    return chainId;
  };

  const getAccounts = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const address = (await web3.eth.getAccounts())[0];
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address) // Balance is in wei
    );
    uiConsole(balance);
    return balance;
  };

  const signMessage = async (): Promise<any> => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const fromAddress = (await web3.eth.getAccounts())[0];
    const originalMessage = [
      {
        type: "string",
        name: "fullName",
        value: "Satoshi Nakamoto",
      },
      {
        type: "uint32",
        name: "userId",
        value: "1212",
      },
    ];
    const params = [originalMessage, fromAddress];
    const method = "eth_signTypedData";
    const signedMessage = await (web3.currentProvider as any)?.sendAsync({
      id: 1,
      method,
      params,
      fromAddress,
    });
    uiConsole(signedMessage);
  };

  const sendTransaction = async () => {
    if (!provider) {
      console.log("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider);
    const fromAddress = (await web3.eth.getAccounts())[0];

    const destination = "0x2E464670992574A613f10F7682D5057fB507Cc21";
    const amount = web3.utils.toWei("0.0001"); // Convert 1 ether to wei

    // Submit transaction to the blockchain and wait for it to be mined
    uiConsole("Sending transaction...");
    const receipt = await web3.eth.sendTransaction({
      from: fromAddress,
      to: destination,
      value: amount,
    });
    uiConsole(receipt);
  };

  const loggedInView = (
    <>
      <h2 className="subtitle">Account Details</h2>
      <div className="flex-container">

        <button onClick={getUserInfo} className="card">
          Get User Info
        </button>
        
        <button onClick={getKeyDetails} className="card">
          Get Key Details
        </button>

        <button onClick={logout} className="card">
          Log Out
        </button>

      </div>
      <h2 className="subtitle">Recovery/ Key Manipulation</h2>
      <div className="flex-container">

        <button onClick={exportShare} className="card">
          Export Backup Share
        </button>
        <button onClick={newPasswordShare} className="card">
          New Password Share
        </button>
        <button onClick={updatePasswordShare} className="card">
          Update Password Share
        </button>
        <button onClick={deletePasswordShare} className="card">
          Delete Password Share
        </button>
        <button onClick={resetAccount} className="card">
          CRITICAL Reset Account
        </button>

      </div>
      <h2 className="subtitle">Blockchain Calls</h2>
      <div className="flex-container">

        <button onClick={getChainID} className="card">
          Get Chain ID
        </button>

        <button onClick={getAccounts} className="card">
          Get Accounts
        </button>

        <button onClick={getBalance} className="card">
          Get Balance
        </button>

        <button onClick={signMessage} className="card">
          Sign Message
        </button>

        <button onClick={sendTransaction} className="card">
          Send Transaction
        </button>

      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={() => login()} className="card">
      Login
    </button>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/guides/mpc" rel="noreferrer">
        Web3Auth Core Kit MPC Beta Redirect
        </a> {" "}
        & ReactJS Ethereum Example
      </h1>

      <div className="grid">{provider ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/tkey/tkey-mpc-beta-react-popup-example" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
