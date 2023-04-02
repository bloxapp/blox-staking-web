import Web3 from "web3";
import { EVENTS, NETWORK_IDS } from "./constants";
import { MODAL_TYPES } from "../../../components/ModalsManager/constants";
import { detect } from "detect-browser";
import { WalletProviderStrategy } from "../WalletProviderStrategy";
import { prefix0x } from '../../../components/UploadDepositFile/helper';
import { DEPOSIT_AMOUNT_WEI } from "../../../constants";
const depositContractABI = require('../../../components/StakingDeposit/contract_abi.json');

export class StrategyError extends Error {
    public code: number;
    public static ERROR_CODE_NOT_CONNECTED = -1;

    constructor(message, errorCode) {
        super(message);
        this.code = errorCode;
    }
}

export default class MetaMaskStrategy extends WalletProviderStrategy {

    private metaMask;
    private networkName: string;

    getWarningModal(): string {
        const browser = detect();
        if (browser.name !== 'chrome' && browser.name !== 'firefox') {
            return MODAL_TYPES.BROWSER_NOT_SUPPORTED;
        } else if (typeof window['ethereum'] == 'undefined') {
            return MODAL_TYPES.METAMASK_NOT_SUPPORTED;
        } else return undefined;
    }

    async connect(): Promise<void> {
        try {
            this.metaMask = window['ethereum'];

            if (!this.metaMask?.networkVersion) {
                throw new StrategyError('MetaMask is not connected. Please try to reload the page.', StrategyError.ERROR_CODE_NOT_CONNECTED);
            }

            await this.metaMask.enable();
            this.web3 = new Web3(Web3.givenProvider);
            this.networkName = NETWORK_IDS[this.metaMask.networkVersion];

            this.metaMask.on(EVENTS['networkChanged'], this.onNetworkChange);
            this.metaMask.on(EVENTS['accountsChanged'], this.onAccountChange);

            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e)
        }
    }

    async info(): Promise<Record<string, any>> {
        const {networkVersion, selectedAddress} = this.metaMask;
        return {
            networkVersion: networkVersion,
            networkName: this.networkName,
            selectedAddress: selectedAddress,
            balance: await this.getBalance(),
        };
    }

    async getBalance(): Promise<string> {
        const balanceInWei = await this.web3.eth.getBalance(this.metaMask.selectedAddress);
        return this.web3.utils.fromWei(balanceInWei, "ether");
    }

    private onNetworkChange = async (networkId) => {
        this.networkName = networkId ? NETWORK_IDS[networkId] : NETWORK_IDS[this.metaMask.networkVersion];
        this.infoUpdateCallback();
    };

    private onAccountChange = async (accountsList) => {
        accountsList.length === 0 ? this.logoutCallback() : this.infoUpdateCallback();
    };

    sendTransaction(genesisForkVersion: Buffer, depositTo: string, accountId: number, txData: string, onStart, onSuccess, onError, depositData?: any): Promise<any> {
        const {selectedAddress} = this.metaMask;

        const method = 'eth_sendTransaction';
        const from = selectedAddress;

        if(depositData){
            const depositContract = new this.web3.eth.Contract(depositContractABI, depositTo);
            const depositMethod = depositContract.methods.deposit(
                prefix0x(depositData.pubkey),
                prefix0x(depositData.withdrawal_credentials),
                prefix0x(depositData.signature),
                prefix0x(depositData.deposit_data_root)
            );
            txData = depositMethod.encodeABI();
        }

        if(!this.verifyDepositRootsAndSignature(genesisForkVersion, txData)) {
            return Promise.reject(new Error('Invalid deposit data'));
        }

        const params = [
            {
                from,
                to: depositTo,
                gas: '186A0', // 100k gas limit
                value: this.web3.utils.numberToHex(DEPOSIT_AMOUNT_WEI),
                data: txData,
            },
        ];

        const configObject = {method, params};
        return this.metaMask.request(configObject)
            .then((response) => {
                onStart(response, accountId);
                this.subscribeToTransactionReceipt(response, onSuccess, accountId);
                Promise.resolve(response);
            })
            .catch((error) => {
                Promise.resolve(onError(error, accountId))
            });
    }

    showLoader = () => {
        return window['ethereum'].networkVersion;
    }

    disconnect() {
        const userEvents = Object.values(EVENTS);
        const events = [...userEvents, 'connect', 'close', 'data', 'error'];
        events.forEach((eventName) => {
            this.metaMask.removeAllListeners(eventName);
        });
    }
}
