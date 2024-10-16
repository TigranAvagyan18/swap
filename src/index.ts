import { Web3 } from 'web3';
import "dotenv/config";
import abi from "./abi/contract"
import { RequestDecodedParam, TransferDecodedParam, Tx, TxLog } from './types';

const chains = {
	bsc: 56,
	optimistic: 250, //10
	arbitrum: 42161,
};

const decodeLogData = (web3: Web3, log: TxLog, walletAddress: string): TransferDecodedParam | RequestDecodedParam | null => {
	const complexOpProcessedAbi: any = abi.find(
		(event) => event.name === 'ComplexOpProcessed'
	);
	const transferEventAbi = {
		inputs: [
			{ indexed: true, type: 'address', name: 'from' },
			{ indexed: true, type: 'address', name: 'to' },
			{ indexed: false, type: 'uint256', name: 'amount' },
		],
	};
	if (
		log.topics[0] ===
		web3.eth.abi.encodeEventSignature(
			'ComplexOpProcessed(uint64,bytes32,uint64,bytes32,uint8,uint8)'
		)
	) {
		return web3.eth.abi.decodeLog(
			complexOpProcessedAbi.inputs,
			log.data,
			log.topics.slice(1)
		) as RequestDecodedParam;
	}

	if (
		log.topics[0] ===
		web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)') &&
		log.topics[1] === web3.utils.padLeft(walletAddress, 64)
	) {
		return web3.eth.abi.decodeLog(
			transferEventAbi.inputs,
			log.data,
			log.topics.slice(1)
		) as TransferDecodedParam;
	}

	return null
};

const checkForSwap = async (
	walletAddress: string,
	network: "arbitrum" | "bsc"
) => {
	const web3 = new Web3(
		`https://${network}-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
	);
	const contractAddress = '0xA2A786ff9148f7C88EE93372Db8CBe9e94585c74';

	try {
		const txs = await web3.eth.getPastLogs({
			fromBlock: 0,
			toBlock: "latest",
			address: contractAddress,
			topics: [null, web3.utils.padLeft(walletAddress.toLowerCase(), 64)],
		}) as Tx[];

		if (!Array.isArray(txs)) return false;

		const txHashes: Record<string, { logs: TxLog[] }> = txs
			.map((tx) => tx.transactionHash)
			.reduce((acc, hash) => {
				//@ts-ignore
				acc[hash] = null;
				return acc;
			}, {});

		await Promise.all(
			Object.keys(txHashes).map(async (txHash) => {
				const txReceipt = await web3.eth.getTransactionReceipt(txHash);
				const logs = txReceipt.logs as TxLog[];
				txHashes[txHash] = { logs };
			})
		);

		for (const hash of Object.values(txHashes)) {
			const info = hash.logs
				.map((log) => {
					try {
						const decodedData = decodeLogData(web3, log, walletAddress);
						return decodedData;
					} catch (error) {
						return null;
					}
				})
				.filter(Boolean) as [TransferDecodedParam, RequestDecodedParam] | [];

			if (info.length === 0) return false;

			if (info[0].amount / BigInt(1e6) < 5) return false;

			if (Number(info[1].currentChainId) !== chains[network]) return false;

			if (Number(info[1].nextChainId) !== chains.optimistic) return false;

			return true;
		}
	} catch (error) {
		console.log(error)
		return false
	}
};


// (async () => {
// 	const walletAddress = '0x9a4407Bf1Dc791383923cc0EA2706607c8E43eb1';
// 	const hasSwapped = await checkForSwap(
// 		walletAddress.toLowerCase(),
// 		'arbitrum'
// 	);
// 	console.log('has swapped', hasSwapped);
// })();
