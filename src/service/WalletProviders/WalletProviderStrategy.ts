import { initBLS } from "@chainsafe/bls";
import { DEPOSIT_AMOUNT_GWEI } from "../../constants";
import { verifyDepositRoots } from "utils/SSZ";
import { verifySignature } from "utils/verifySignature";
import Web3 from "web3";
const depositContractABI = require('../../components/StakingDeposit/contract_abi.json');


export abstract class WalletProviderStrategy{

    protected web3: Web3;
    protected timer= {};
    protected infoUpdateCallback: () => void;
    protected logoutCallback: () => void;

    abstract connect();
    abstract disconnect()
    abstract getBalance(): Promise<string>
    getWarningModal(): string{
        return undefined
    }
    abstract info(): Record<string, any>
    abstract sendTransaction(genesisForkVersion: Buffer, depositTo: string, accountId: number, txData: string, onStart, onSuccess, onError, depositData?: any);

    subscribeToUpdate(callback) {
        this.infoUpdateCallback = callback;
    }
    subscribeToLogout(callback){
        this.logoutCallback = callback;
    }
    getReceipt = async (txHash) => {
        try {
            return await this.web3.eth.getTransactionReceipt(txHash);
        }
        catch(error) {
            return error.message;
        }
    };
    protected subscribeToTransactionReceipt = (txHash, onSuccess, accountId) => {
        const callback = (error, txReceipt) => {
            if(error || txReceipt) {
                if (this.timer[txHash]) clearInterval(this.timer[txHash]);
            }
            if(error) {
                onSuccess(error, null, accountId);
            }
            if(txReceipt) {
                onSuccess(null, txReceipt, accountId);
            }
        };
        this.timer[txHash] = setInterval(() => {
            this.web3.eth.getTransactionReceipt(txHash, callback);
        }, 3000);
    };
    showLoader = (): boolean => {
        return false;
    }
    verifyDepositRootsAndSignature = async (genesisForkVersion: Buffer, txData: string): Promise<boolean> => {
        if(!genesisForkVersion || genesisForkVersion.length !== 4) {
            throw new Error("Invalid genesis fork version");
        }
        
        const depositAmount = Number(DEPOSIT_AMOUNT_GWEI);
        if(isNaN(depositAmount) || depositAmount <= 0) {
            throw new Error("Invalid deposit amount");
        }

        const depositFunctionABI = depositContractABI.find(
            (item) => item.name === "deposit"
        );

        // Get the encoded function signature from the ABI
        const functionSignature = this.web3.eth.abi.encodeFunctionSignature(depositFunctionABI);

        if (!txData.startsWith(functionSignature)) {
            throw new Error("The provided txData does not match the deposit function signature");
        }

        // Remove the function signature from the txData
        const encodedParameters = txData.slice(10);

        // Decode the parameters using web3.eth.abi.decodeParameters
        const decodedParameters = this.web3.eth.abi.decodeParameters(
            depositFunctionABI.inputs,
            encodedParameters
        );

        // Create the depositData object
        const depositData = {
            pubkey: decodedParameters.pubkey as string,
            withdrawal_credentials: decodedParameters.withdrawal_credentials as string,
            signature: decodedParameters.signature as string,
            deposit_data_root: decodedParameters.deposit_data_root as string,
            amount: Number(DEPOSIT_AMOUNT_GWEI),
        };

        // Verify the deposit roots and signature.
        await initBLS(); // TODO: move this to a better place
        const {depositMessageRoot, valid: validRoots} = verifyDepositRoots(depositData);
        if(!validRoots){
            return false;
        }
        return verifySignature(
            genesisForkVersion,
            depositData,
            depositMessageRoot,
        );
    }
}
