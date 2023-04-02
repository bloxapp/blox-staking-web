import PortisStrategy from "./Portis/PortisStrategy";
import MetaMaskStrategy from "./Metamask/MetaMaskStrategy";
import {WalletProviderStrategy} from "./WalletProviderStrategy";


export default class WalletProvidersContext {

    protected providerType: string;
    private _strategy: WalletProviderStrategy;


    constructor(walletProvider: string, networkType:string) {
        this.providerType = walletProvider;
        switch (walletProvider) {
            case "portis":
                this._strategy = new PortisStrategy(networkType);
                break;
            case "ledger":
            case "trezor":
            case "metaMask":
                this._strategy = new MetaMaskStrategy();
                break;
            default:
                throw Error('No such wallet provider!')
        }
    }


    set strategy(value: WalletProviderStrategy) {
        this._strategy = value;
    }

    public  getWarningModal() : string{
        return this._strategy.getWarningModal();
    }

    public async connect() {
        return this._strategy.connect();
    }

    public async getInfo(){
        return this._strategy.info();
    }

    public subscribeToUpdate(callback){
        return this._strategy.subscribeToUpdate(callback);
    }

    public subscribeToLogout(callback){
        return this._strategy.subscribeToLogout(callback);
    }

    public sendSignTransaction(genesisForkVersion: Buffer, depositTo: string, accountId: number, txData: string, onStart, onSuccess, onError, depositData?): void {
        return this._strategy.sendTransaction(genesisForkVersion, depositTo, accountId, txData, onStart, onSuccess, onError, depositData);
    };

    public async getReceipt(txHash) {
        return await this._strategy.getReceipt(txHash);
    };

    public disconnect(){
        return this._strategy.disconnect();
    }

    public showLoader() : boolean{
        return this._strategy.showLoader();
    }

    public async verifyDepositRootsAndSignature(genesisForkVersion: Buffer, txData: string): Promise<boolean> {
        return await this._strategy.verifyDepositRootsAndSignature(genesisForkVersion, txData);
    }
}
