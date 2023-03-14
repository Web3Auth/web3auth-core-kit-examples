import React, { useEffect, useState } from 'react';
import './App.css';
import swal from 'sweetalert';
import {tKey} from "./tkey"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3 from "web3";
import BN from 'bn.js';


function App() {
	const [user, setUser] = useState<any>(null);
	const [privateKey, setPrivateKey] = useState<any>();
	const [provider, setProvider] = useState<any>();

	// Init Service Provider inside the useEffect Method
	useEffect(() => {
		const init = async () => {
			// Initialization of Service Provider
			try {
				// Init is required for Redirect Flow but skip fetching sw.js and redirect.html )
				(tKey.serviceProvider as any).init({skipInit: true});
				if ( window.location.pathname === "/auth" && window.location.hash.includes("#state") ) {
					let result = await (tKey.serviceProvider as any).directWeb.getRedirectResult();
					tKey.serviceProvider.postboxKey = new BN ( (result.result as any).privateKey!  , "hex");
					setUser( (result.result as any).userInfo);
					initializeNewKey();
				}

			} catch (error) {
			  console.error(error);
			}
		  };
		  init();
		const ethProvider = async() => {
			const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
			  config: {
				/*
				pass the chain config that you want to connect with
				all chainConfig fields are required.
				*/
				chainConfig: {
				  chainId: "0x13881",
				  rpcTarget: "https://rpc.ankr.com/polygon_mumbai",
				  displayName: "Polygon Testnet",
				  blockExplorer: "https://mumbai.polygonscan.com",
				  ticker: "MATIC",
				  tickerName: "Matic",
				},
			  },
			});
			/*
			pass user's private key here.
			after calling setupProvider, we can use
			*/
			if(privateKey){
				await ethereumPrivateKeyProvider.setupProvider(privateKey);
				console.log(ethereumPrivateKeyProvider.provider);
				setProvider(ethereumPrivateKeyProvider.provider);
			}
		  }
		ethProvider();
	}, [privateKey]);

	const triggerLogin = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		try {
			// Triggering Login using Service Provider ==> redirects the user to google login page
			const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
				typeOfLogin: 'google',
				verifier: 'google-tkey-w3a',
				clientId:
					'774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com',
			});
			setUser(loginResponse.userInfo);
			// uiConsole('Public Key : ' + loginResponse.publicAddress);
			// uiConsole('Email : ' + loginResponse.userInfo.email);

			initializeNewKey();
		} catch (error) {
			console.log(error);
			uiConsole(error);
		}
	};

	const initializeNewKey = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		try {
			// Initialization of tKey
			await tKey.initialize(); // 1/2 flow
			// Gets the deviceShare
			console.log(tKey);
			try {
				// throw new Error('Device share not found');
				await (tKey.modules.webStorage as any).inputShareFromWebStorage(); // 2/2 flow
			} catch (e) {
				uiConsole(e);
				// await backupShareRecover();
				await recoverShare();
			}

			console.log(tKey);
			// Checks the requiredShares to reconstruct the tKey,
			// starts from 2 by default and each of the above share reduce it by one.
			const { requiredShares } = tKey.getKeyDetails();
			console.log(tKey);
			if (requiredShares <= 0) {
				const reconstructedKey = await tKey.reconstructKey();
				setPrivateKey(reconstructedKey?.privKey.toString("hex"))
				uiConsole(
					'Private Key: ' + reconstructedKey.privKey.toString("hex"),
				);
			}
		} catch (error) {
			uiConsole(error, 'caught');
		}
	};

	const changeSecurityQuestionAndAnswer = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter password (>10 characters)', {
			content: 'input' as any,
		}).then(async value => {
			if (value.length > 10) {
				await (tKey.modules.securityQuestions as any).changeSecurityQuestionAndAnswer(value, 'whats your password?');
				swal('Success', 'Successfully changed new share with password.', 'success');
				uiConsole('Successfully changed new share with password.');
			} else {
				swal('Error', 'Password must be >= 11 characters', 'error');
			}
		});
		const keyDetails = await tKey.getKeyDetails();
		uiConsole(keyDetails);
	};

	const generateNewShareWithPassword = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter password (>10 characters)', {
			content: 'input' as any,
		}).then(async value => {
			if (value.length > 10) {
				try {
					await (tKey.modules.securityQuestions as any).generateNewShareWithSecurityQuestions(
						value,
						'whats your password?',
					);
					swal('Success', 'Successfully generated new share with password.', 'success');
					uiConsole('Successfully generated new share with password.');
				} catch (error) {
					swal('Error', (error as any)?.message.toString(), 'error');
				}
			} else {
				swal('Error', 'Password must be >= 11 characters', 'error');
			}
		});
	}

	const generateMnemonic = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		try {
			const newShare = await tKey.generateNewShare();
			const mnemonic = await tKey.outputShare(newShare.newShareIndex, "mnemonic");
			uiConsole('Mnemonic: ' + mnemonic);
		} catch (error) {
			uiConsole(error);
		}
	};

	const backupShareRecover = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter mnemonic', {
			content: 'input' as any,
		}).then(async value => {
			try {
				await tKey.inputShare(value, "mnemonic"); // 2/2 flow
				// const { requiredShares } = tKey.getKeyDetails();
				// if (requiredShares <= 0) {
					const reconstructedKey = await tKey.reconstructKey();
					console.log(reconstructedKey)
					uiConsole(
						'Private Key: ' + reconstructedKey.privKey.toString("hex"),
						);
						setPrivateKey(reconstructedKey?.privKey.toString("hex"))
				// }
			} catch (error) {
				uiConsole(error);
			}
		});
	};
	
	const recoverShare = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		// swal is just a pretty dialog box
		swal('Enter password (>10 characters)', {
			content: 'input' as any,
		}).then(async value => {
			if (value.length > 10) {
				try {
					await (tKey.modules.securityQuestions as any).inputShareFromSecurityQuestions(value); // 2/2 flow
					const { requiredShares } = tKey.getKeyDetails();
					if (requiredShares <= 0) {
						const reconstructedKey = await tKey.reconstructKey();
						setPrivateKey(reconstructedKey?.privKey.toString("hex"))
						uiConsole(
							'Private Key: ' + reconstructedKey.privKey.toString("hex"),
						);
					}
					const newShare = await tKey.generateNewShare();
					const shareStore = await tKey.outputShareStore(newShare.newShareIndex);
					await (tKey.modules.webStorage as any).storeDeviceShare(shareStore);
					swal('Success', 'Successfully logged you in with the recovery password.', 'success');
					uiConsole('Successfully logged you in with the recovery password.');
				} catch (error) {
					swal('Error', (error as any)?.message.toString(), 'error');
					uiConsole(error);
					logout();
				}
			} else {
				swal('Error', 'Password must be >= 11 characters', 'error');
				logout();
			}
		});
	}

	const keyDetails = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		const keyDetails = await tKey.getKeyDetails();
		uiConsole(keyDetails);
	};

	const logout = (): void => {
		uiConsole('Log out');
		setUser(null);
	};

	const getUserInfo = (): void => {
		uiConsole(user);
	};

	const getPrivateKey = (): void => {
		uiConsole(privateKey);
	};

	const getChainID = async() => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider);
		const chainId = await web3.eth.getChainId();
		uiConsole(chainId)
	}

	const getAccounts = async() => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider);
		const address = (await web3.eth.getAccounts())[0];
		uiConsole(address)
	}

	const getBalance = async() => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider);
		const address = (await web3.eth.getAccounts())[0];
		const balance = web3.utils.fromWei(
			await web3.eth.getBalance(address) // Balance is in wei
		  );
		uiConsole(balance)
	}

	const signMessage = async(): Promise<any> => {
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
		uiConsole(signedMessage)
	}

	const sendTransaction = async() => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider);
		const fromAddress = (await web3.eth.getAccounts())[0];

		const destination = "0x7aFac68875d2841dc16F1730Fba43974060b907A";
		const amount = web3.utils.toWei("0.0001"); // Convert 1 ether to wei

		// Submit transaction to the blockchain and wait for it to be mined
		const receipt = await web3.eth.sendTransaction({
			from: fromAddress,
			to: destination,
			value: amount,
			maxPriorityFeePerGas: "5000000000", // Max priority fee per gas
			maxFeePerGas: "6000000000000", // Max fee per gas
		});
		uiConsole(receipt)
	}

	const uiConsole = (...args: any[]): void => {
		const el = document.querySelector('#console>p');
		if (el) {
			el.innerHTML = JSON.stringify(args || {}, null, 2);
		}
	};

	const loggedInView = (
		<>
			<div className='flex-container'>
				<div>
					<button onClick={getUserInfo} className='card'>
						Get User Info
					</button>
				</div>
				<div>
					<button onClick={generateNewShareWithPassword} className='card'>
						Generate Password Share
					</button>
				</div>
				<div>
					<button onClick={changeSecurityQuestionAndAnswer} className='card'>
						Change Password Share
					</button>
				</div>
				<div>
					<button onClick={generateMnemonic} className='card'>
						Generate Backup (Mnemonic)
					</button>
				</div>
				<div>
					<button onClick={backupShareRecover} className='card'>
						Input Backup Share
					</button>
				</div>
				<div>
					<button onClick={keyDetails} className='card'>
						Key Details
					</button>
				</div>
				<div>
					<button onClick={getPrivateKey} className='card'>
						Private Key
					</button>
				</div>
				<div>
					<button onClick={getChainID} className='card'>
						Get Chain ID
					</button>
				</div>
				<div>
					<button onClick={getAccounts} className='card'>
						Get Accounts
					</button>
				</div>
				<div>
					<button onClick={getBalance} className='card'>
						Get Balance
					</button>
				</div>
				
				<div>
					<button onClick={signMessage} className='card'>
						Sign Message
					</button>
				</div>
				<div>
					<button onClick={sendTransaction} className='card'>
						Send Transaction
					</button>
				</div>
				<div>
					<button onClick={logout} className='card'>
						Log Out
					</button>
				</div>
			</div>

			<div id='console' style={{ whiteSpace: 'pre-line' }}>
				<p style={{ whiteSpace: 'pre-line' }}></p>
			</div>
		</>
	);

	const unloggedInView = (
		<button onClick={triggerLogin} className='card'>
			Login
		</button>
	);

	return (
		<div className='container'>
			<h1 className='title'>
				<a target='_blank' href='http://web3auth.io/' rel='noreferrer'>
					Web3Auth (tKey)
				</a>
				& ReactJS Ethereum Example
			</h1>

			<div className='grid'>{user ? loggedInView : unloggedInView}</div>

			<footer className='footer'>
				<a
					href='https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/tkey/tkey-react-redirectflow-example'
					target='_blank'
					rel='noopener noreferrer'
				>
					Source code
				</a>
			</footer>
		</div>
	);
}

export default App;
