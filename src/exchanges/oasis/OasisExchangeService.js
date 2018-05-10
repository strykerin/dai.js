import PrivateService from '../../core/PrivateService';
import Web3Service from '../../eth/Web3Service';
import SmartContractService from '../../eth/SmartContractService';
import EthereumTokenService from '../../eth/EthereumTokenService';
import OasisSellOrder from './OasisSellOrder';
import OasisBuyOrder from './OasisBuyOrder';
import TransactionObject from '../../eth/TransactionObject';
import GasEstimatorService from '../../eth/GasEstimatorService';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';
import EthereumCdpService from '../../eth/EthereumCdpService';
import TokenConversionService from '../../eth/TokenConversionService';

export default class OasisExchangeService extends PrivateService {
  static buildKovanService() {
    const service = new OasisExchangeService(),
      web3 = Web3Service.buildInfuraService(
        'kovan',
        '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700'
      ),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(
        smartContractService
      );

    service
      .manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('token', ethereumTokenService)
      .inject(
        'gasEstimator',
        GasEstimatorService.buildTestService(smartContractService.get('web3'))
      );

    return service;
  }
/*
  static buildTestService(privateKey = null) {
    const service = new OasisExchangeService(),
      web3 = Web3Service.buildTestService(privateKey),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(
        smartContractService
      );

    service
      .manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('token', ethereumTokenService)
      .inject(
        'gasEstimator',
        GasEstimatorService.buildTestService(smartContractService.get('web3'))
      );

    return service;
  }*/

  static buildTestService(privateKey = null) {
    const service = new OasisExchangeService(),
      web3 = Web3Service.buildTestService(privateKey),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(
        smartContractService
      ),
      cdpService = EthereumCdpService.buildTestService(smartContractService, EthereumTokenService, TokenConversionService.buildTestService(smartContractService));

    service
      .manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('token', ethereumTokenService)
      .inject(
        'gasEstimator',
        GasEstimatorService.buildTestService(smartContractService.get('web3'))
      )
      .inject('cdp', cdpService);

    return service;
  }

  constructor(name = 'oasisExchange') {
    super(name, ['cdp', 'smartContract', 'token', 'web3', 'log', 'gasEstimator']);
  }

  /*
daiAmount: amount of Dai to sell
tokenSymbol: symbol of token to buy
minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
*/
  sellDai(daiAmount, tokenSymbol, minFillAmount = '0') {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(tokens.DAI);
    const daiAddress = daiToken.address();
    const buyTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const minFillAmountEVM = daiToken.toEthereumFormat(minFillAmount);
    return new OasisSellOrder(
      oasisContract.sellAllAmount(
        daiAddress,
        daiAmountEVM,
        buyTokenAddress,
        minFillAmountEVM,
        { gasLimit: 300000 }
      ),
      this.get('web3'),
      oasisContract
    );
  }

  /*
daiAmount: amount of Dai to buy
tokenSymbol: symbol of token to sell
maxFillAmount: If the trade can't be done without selling more than the maxFillAmount of selling token, it will fail
*/
  buyDai(daiAmount, tokenSymbol, maxFillAmount = '-1') {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(tokens.DAI);
    const daiAddress = daiToken.address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const maxFillAmountEVM = daiToken.toEthereumFormat(maxFillAmount);
    const sellTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    return new OasisBuyOrder(
      oasisContract.buyAllAmount(
        daiAddress,
        daiAmountEVM,
        sellTokenAddress,
        maxFillAmountEVM,
        { gasLimit: 300000 }
      ),
      this.get('web3'),
      oasisContract
    );
  }

  //only used to set up a limit order on the local testnet
  offer(
    payAmount,
    payTokenAddress,
    buyAmount,
    buyTokenAddress,
    pos,
    overrides
  ) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    return new TransactionObject(
    oasisContract.offer(
      payAmount,
      payTokenAddress,
      buyAmount,
      buyTokenAddress,
      pos,
      overrides
      ),
      this.get('web3')
    );
  }
}
