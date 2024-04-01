import * as algokit from '@algorandfoundation/algokit-utils'
import { AppDetails } from '@algorandfoundation/algokit-utils/types/app-client'
import { Algodv2, Indexer } from 'algosdk'
import { TicTacToeSinglePlayerClient } from '../contracts/tic_tac_toe_single_player'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from './network/getAlgoClientConfigs'

export interface TicTacToeGameState {
  playerXState: number
  playerOState: number
  playerOIndex: number
  betAmount: number
  gameStatus: number
}

interface DeployParams {
  onSchemaBreak: string
  onUpdate: string
}

class AlgorandService {
  private algodClient: Algodv2
  private indexer: Indexer
  private appClient: TicTacToeSinglePlayerClient | null = null
  private appId: number = 0
  public appAddress: string = ''
  constructor() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    this.algodClient = algokit.getAlgoClient({
      server: algodConfig.server,
      port: algodConfig.port,
      token: algodConfig.token,
    }) as Algodv2

    const indexerConfig = getIndexerConfigFromViteEnvironment()
    this.indexer = algokit.getAlgoIndexerClient({
      server: indexerConfig.server,
      port: indexerConfig.port,
      token: indexerConfig.token,
    }) as Indexer
  }

  public async initializeAppClient(activeAddress: string, signer: any): Promise<void> {
    const appDetails: AppDetails = {
      resolveBy: 'creatorAndName',
      name: this.generateUniqueName('TicTacToe'),
      sender: { signer, addr: activeAddress },
      creatorAddress: activeAddress,
      findExistingUsing: this.indexer,
    }
    this.appClient = new TicTacToeSinglePlayerClient(appDetails, this.algodClient)

    console.log('Novi app client')
  }

  private generateUniqueName(baseName: string): string {
    const timestamp = Date.now()
    return `${baseName}_${timestamp}`
  }

  public async deployContract(deployParams: DeployParams, activeAddress: string, signer: any): Promise<string> {
    this.initializeAppClient(activeAddress, signer)
    try {
      console.log(deployParams)
      const response = await this.appClient.deploy(deployParams)
      this.appId = Number(response.appId)
      this.appAddress = response.appAddress
      console.log(`Contract deployed successfully with appId:${this.appId}`)

      return `Contract deployed successfully with appId: ${this.appId}`
    } catch (error) {
      return 'Error occured while deploying!'
    }
  }

  public async payWinner(): Promise<string> {
    if (!this.appClient) {
      throw new Error('AppClient is not initialized.')
    }

    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do()

      console.log(suggestedParams)
      const params = {
        //suggestedParams, PROVJERI DA LI TREBAJU OVI SUGGESTED PARAMS CINI SE DA RADI I SA NJIMA I BEZ NJIH SAMO SE NIGDJE NE VIDI TRANSAKCIJA
      }
      const result = await this.appClient.moneyRefundLogic({}, params)

      console.log('Money refund logic call result:', result)
      return 'Prize sucessfully sent to the winner.'
    } catch (error) {
      console.error('Failed to execute money refund logic:', error)
      throw new Error(`Error making the transaction: ${error.message}`)
    }
  }

  public async playActionLogic(positionIndex: number) {
    if (!this.appClient) throw new Error('appClient is not initialized')
    try {
      await this.appClient.playActionLogic({ position_index: positionIndex })
    } catch (error) {
      throw new Error(`Error calling the contract: ${error.message}`)
    }
  }

  public async getApplicationState(): Promise<TicTacToeGameState> {
    if (this.appId === 0) {
      throw new Error('App is not deployed yet!')
    }

    try {
      const appInfo = await this.algodClient.getApplicationByID(this.appId).do()
      const stateData: Partial<TicTacToeGameState> = {}
      appInfo.params['global-state'].forEach((state) => {
        const key = decodeBase64(state.key)
        const value = state.value.type === 2 ? state.value.uint : decodeBase64(state.value.bytes)

        console.log(`${key}: ${value}`)

        switch (key) {
          case 'player_x_state':
            stateData.playerXState = value as number
            break
          case 'player_o_state':
            stateData.playerOState = value as number
            break
          case 'player_o_index':
            stateData.playerOIndex = value as number
            break
          case 'bet_amount':
            stateData.betAmount = value as number
            break
          case 'game_status':
            stateData.gameStatus = value as number
            break
        }
      })

      console.log(stateData)
      return stateData as TicTacToeGameState // Cast to TicTacToeGameState since we know all fields should be populated
    } catch (e: unknown) {
      console.error('Error retrieving application state:', e.message)
      throw e
    }
  }
}

function decodeBase64(base64String: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64String, 'base64').toString()
  } else {
    return atob(base64String)
  }
}

export default new AlgorandService()
