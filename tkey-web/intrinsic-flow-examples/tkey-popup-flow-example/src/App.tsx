import { useEffect, useState } from 'react';
import { tKey } from "./tkey"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3 from "web3";
import { IProvider } from "@web3auth/base";
import { WebStorageModule } from '@tkey/web-storage';
import { ShareSerializationModule } from '@tkey/share-serialization';
import { SecurityQuestionsModule } from '@tkey/security-questions';
import swal from 'sweetalert';
import { TorusServiceProvider } from "@tkey/service-provider-torus";


import './App.css';

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

function App() {
	const [tKeyInitialised, setTKeyInitialised] = useState(false);
	const [provider, setProvider] = useState<IProvider | null>(null);
	const [loggedIn, setLoggedIn] = useState(false);
	const [userInfo, setUserInfo] = useState({});
	const [recoveryShare, setRecoveryShare] = useState<string>("");
	const [passwordShare, setPasswordShare] = useState<string>("");
	const [mnemonicShare, setMnemonicShare] = useState<string>("");

	// Init Service Provider inside the useEffect Method
	useEffect(() => {
		const init = async () => {
			// Initialization of Service Provider
			try {
				await (tKey.serviceProvider as TorusServiceProvider).init({});
			} catch (error) {
				console.error(error);
			}
		};
		init();
	}, []);

	const login = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		try {
			// Triggering Login using Service Provider ==> opens the popup
			const loginResponse = await (tKey.serviceProvider as any).triggerLogin({
				typeOfLogin: 'google',
				verifier: 'w3a-google-demo',
				clientId:
					'519228911939-cri01h55lsjbsia1k7ll6qpalrus75ps.apps.googleusercontent.com',
			});

			setUserInfo(loginResponse.userInfo);
			// Initialization of tKey
			await tKey.initialize(); // 1/2 flow

			setTKeyInitialised(true);

			var { requiredShares } = tKey.getKeyDetails();

			if (requiredShares > 0) {
				uiConsole('Please enter your backup shares, requiredShares:', requiredShares);
			} else {
				await reconstructKey();
			}
		} catch (error) {
			uiConsole(error, 'caught');
		}
	};

	const reconstructKey = async () => {
		try {
			const reconstructedKey = await tKey.reconstructKey();
			const privateKey = reconstructedKey?.privKey.toString('hex');

			await ethereumPrivateKeyProvider.setupProvider(privateKey);
			setProvider(ethereumPrivateKeyProvider);
			setLoggedIn(true);
			setDeviceShare();
		} catch (e) {
			uiConsole(e);
		}
	};

	const inputRecoveryShare = async (share: string) => {
		try {
			await tKey.inputShare(share);
			await reconstructKey();
			uiConsole('Recovery Share Input Successfully');
			return;
		} catch (error) {
			uiConsole('Input Recovery Share Error:', error);
		}
	};

	const setDeviceShare = async () => {
		try {
			const generateShareResult = await tKey.generateNewShare();
			const share = await tKey.outputShareStore(
				generateShareResult.newShareIndex,
			);
			await (
				tKey.modules.webStorage as WebStorageModule
			).storeDeviceShare(share);
			uiConsole('Device Share Set', JSON.stringify(share));
		} catch (error) {
			uiConsole('Error', (error as any)?.message.toString(), 'error');
		}
	};

	const getDeviceShare = async () => {
		try {
			const share = await (
				tKey.modules.webStorage as WebStorageModule
			).getDeviceShare();

			if (share) {
				uiConsole(
					'Device Share Captured Successfully across',
					JSON.stringify(share),
				);
				setRecoveryShare(share.share.share.toString('hex'));
				return share;
			}
			uiConsole('Device Share Not found');
			return null;
		} catch (error) {
			uiConsole('Error', (error as any)?.message.toString(), 'error');
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
				await (tKey.modules.securityQuestions as SecurityQuestionsModule).changeSecurityQuestionAndAnswer(value, 'whats your password?');
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
					await (tKey.modules.securityQuestions as SecurityQuestionsModule).generateNewShareWithSecurityQuestions(
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

	const RecoverPasswordShare = async (password: string) => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}

		try {
			if (password.length > 10) {
				await (tKey.modules.securityQuestions as SecurityQuestionsModule).inputShareFromSecurityQuestions(password);
				await reconstructKey();
				uiConsole('Successfully recovered new share with password.');
				
			} else {
				throw new Error('Password must be >= 11 characters');
			}
		} catch (error) {
			uiConsole(error);
		}
	}

	const exportMnemonicShare = async () => {
		try {
			const generateShareResult = await tKey.generateNewShare();
			const share = await tKey.outputShareStore(
				generateShareResult.newShareIndex,
			).share.share;
			const mnemonic = await (
				tKey.modules.shareSerialization as ShareSerializationModule
			).serialize(share, 'mnemonic');
			uiConsole(mnemonic);
			return mnemonic;
		} catch (error) {
			uiConsole(error);
		}
	};

	const MnemonicToShareHex = async (mnemonic: string) => {
		if (!tKey) {
			uiConsole('tKey not initialized yet');
			return;
		}
		try {
			const share = await (
				tKey.modules.shareSerialization as ShareSerializationModule
			).deserialize(mnemonic, 'mnemonic');
			setRecoveryShare(share.toString("hex"));
			return share;
		} catch (error) {
			uiConsole(error);
		}
	};

	const keyDetails = async () => {
		if (!tKey) {
			uiConsole("tKey not initialized yet");
			return;
		}
		const keyDetails = await tKey.getKeyDetails();
		uiConsole(keyDetails);
	};

	const criticalResetAccount = async (): Promise<void> => {
		// This is a critical function that should only be used for testing purposes
		// Resetting your account means clearing all the metadata associated with it from the metadata server
		// The key details will be deleted from our server and you will not be able to recover your account
		if (!tKeyInitialised) {
			throw new Error("tKeyInitialised is initialised yet");
		}
		await tKey.storageLayer.setMetadata({
			privKey: tKey.serviceProvider.postboxKey,
			input: { message: "KEY_NOT_FOUND" },
		});
		uiConsole('reset');
		logout();
	}

	const logout = async () => {
		setProvider(null);
		setLoggedIn(false);
		setUserInfo({});
		uiConsole("logged out");
	};
	const getUserInfo = async () => {
		uiConsole(userInfo);
	};

	const getChainID = async () => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider as any);

		// Get the connected Chain's ID
		const chainId = (await web3.eth.getChainId()).toString(16);
		uiConsole(chainId)
	}

	const getAccounts = async () => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider as any);

		// Get user's Ethereum public address
		const address = await web3.eth.getAccounts();
		uiConsole(address)
	}

	const getBalance = async () => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider as any);

		// Get user's Ethereum public address
		const address = (await web3.eth.getAccounts())[0];

		// Get user's balance in ether
		const balance = web3.utils.fromWei(
			await web3.eth.getBalance(address), // Balance is in wei
			"ether"
		);
		uiConsole(balance)
	}

	const signMessage = async (): Promise<any> => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider as any);

		// Get user's Ethereum public address
		const fromAddress = (await web3.eth.getAccounts())[0];

		const originalMessage = "YOUR_MESSAGE";

		// Sign the message
		const signedMessage = await web3.eth.personal.sign(
			originalMessage,
			fromAddress,
			"test password!" // configure your own password here.
		);

		uiConsole(signedMessage)
	}

	const sendTransaction = async () => {
		if (!provider) {
			console.log("provider not initialized yet");
			return;
		}
		const web3 = new Web3(provider as any);

		// Get user's Ethereum public address
		const fromAddress = (await web3.eth.getAccounts())[0];

		const destination = "0x4041FF26b6713FCd5659471521BA2e514E23750d";

		// Convert amount to wei
		const amount = web3.utils.toWei("0.04", "ether");

		// Submit transaction to the blockchain and wait for it to be mined
		const receipt = await web3.eth.sendTransaction({
			from: fromAddress,
			to: destination,
			gasLimit: "21000",
			maxFeePerGas: "300",
			maxPriorityFeePerGas: "10",
			value: amount,
		});
		uiConsole(receipt)
	}

	const uiConsole = (...args: any[]): void => {
		const el = document.querySelector('#console>p');
		if (el) {
			el.innerHTML = JSON.stringify(args || {}, null, 2);
		}
		console.log(...args);
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
					<button onClick={keyDetails} className='card'>
						Key Details
					</button>
				</div>
				<div>
					<button onClick={exportMnemonicShare} className='card'>
						Generate Backup (Mnemonic)
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
				<div>
					<button onClick={criticalResetAccount} className="card">
						[CRITICAL] Reset Account
					</button>
				</div>
			</div>
		</>
	);

	const unloggedInView = (
		<>
			<button onClick={login} className="card">
				Login
			</button>
			<div className={tKeyInitialised ? "" : "disabledDiv"} >

				<button onClick={() => getDeviceShare()} className="card">
					Get Device Share
				</button>
				<label>Backup/ Device Share:</label>
				<input value={recoveryShare} onChange={(e) => setRecoveryShare(e.target.value)}></input>
				<button onClick={() => inputRecoveryShare(recoveryShare)} className="card">
					Input Recovery Share
				</button>
				<button onClick={criticalResetAccount} className="card">
					[CRITICAL] Reset Account
				</button>
				<label>Recover Using Mnemonic Share:</label>
				<input value={mnemonicShare} onChange={(e) => setMnemonicShare(e.target.value)}></input>
				<button onClick={() => MnemonicToShareHex(mnemonicShare)} className="card">
					Get Recovery Share using Mnemonic
				</button>
				<br /><br />

				<label>Enter your Password Share:</label>
				<input value={passwordShare} onChange={(e) => setPasswordShare(e.target.value)}></input>
				<button onClick={() => RecoverPasswordShare(passwordShare)} className="card">
					Recover Account using Password
				</button>
			</div>
		</>
	);

	return (
		<div className='container'>
			<h1 className='title'>
				<a target='_blank' href='https://web3auth.io/docs/sdk/core-kit/tkey' rel='noreferrer'>
					Web3Auth (tKey)
				</a>
				& ReactJS Ethereum Example
			</h1>

			<div className='grid'>{loggedIn ? loggedInView : unloggedInView}</div>


			<div id='console' style={{ whiteSpace: 'pre-line' }}>
				<p style={{ whiteSpace: 'pre-line' }}></p>
			</div>

			<footer className='footer'>
				<a
					href='https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/tkey-web/intrinsic-flow-examples/tkey-popup-flow-example'
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
