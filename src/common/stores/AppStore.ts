import Analytics from 'analytics';
import {createContext} from 'react';
import {action, observable, makeObservable, computed} from 'mobx';
import { NETWORKS } from '../../components/StakingDeposit/constants';
import bloxAnalyticsPlugin from '../../service/analytics/blox-analytics-plugin';
import { bufferHex } from 'utils/utils';

const RELEVANT_PARAMS = [
    {name: 'id_token', mandatory: true, callback: 'setAnalytics'},
    {name: 'network_id', mandatory: true, callback: 'setNetwork'},
    {name: 'account_id', mandatory: true},
    {name: 'tx_data', mandatory: false, callback: 'setSeedMode'}
]

class AppStore {
    analytics;
    seedMode = true;
    transactionsInProgress = {};
    depositContract;
    genesisForkVersion?: Buffer;
    queryParams = {};
    allMandatoryParamsExist = true;
    successfullyDeposited = [];


    constructor() {
        makeObservable(this, {
            //Observable
            analytics: observable,
            queryParams: observable,
            depositContract: observable,
            genesisForkVersion: observable,
            successfullyDeposited: observable,
            transactionsInProgress: observable,
            allMandatoryParamsExist: observable,

            //Action
            setQueryParams: action,
            addDepositedValidator: action.bound,
            setTransactionInProgress: action.bound,

            //computed
            isTransactionsInProgress: computed,
        })
    }

    setQueryParams(){
        const urlParams = new URLSearchParams(window.location.search);
        for (let key of RELEVANT_PARAMS) {
            if(!urlParams.get(key.name) && key.mandatory){
                this.allMandatoryParamsExist = false;
            }
            if(urlParams.get(key.name) && key.callback){
                this[key.callback](urlParams.get(key.name))
            }
            this.queryParams[key.name] = urlParams.get(key.name);
        }
    }

    setNetwork(networkId: string){
        const network = NETWORKS[networkId];
        if(!network) {
            throw new Error('Network not supported');
        }
        
        // Verify & set genesis fork version.
        const genesisForkVersion = bufferHex(NETWORKS[networkId].genesis_fork_version);
        if(!genesisForkVersion || genesisForkVersion.length !== 4){
            throw new Error('Genesis fork version not supported');
        }
        this.genesisForkVersion = genesisForkVersion;
        
        // Verify & set deposit contract address.
        if(bufferHex(NETWORKS[networkId].contract).length !== 20){
            throw new Error('Deposit contract not supported');
        }
        this.depositContract = NETWORKS[networkId].contract;
    }

    addDepositedValidator(accountId: string){
        this.successfullyDeposited.push(accountId);
    }

    setAnalytics(token: string){
        this.analytics = Analytics({app: 'blox-live', plugins: [bloxAnalyticsPlugin(token)]});
    }

    setSeedMode(isSeed: boolean){
        this.seedMode = !!isSeed
    }

    setTransactionInProgress(accountId: string, status: boolean) {
        if(status){
            this.transactionsInProgress[accountId] = true;
        } else {
            delete this.transactionsInProgress[accountId];
        }
    }

    get isTransactionsInProgress() {
        return Object.keys(this.transactionsInProgress).length !== 0
    }
}

export const AppStoreContext = createContext(new AppStore());