import { useWallet } from '@txnlab/use-wallet'
import { useSnackbar } from 'notistack'
import React, { useEffect, useState } from 'react'
import Loading from 'react-fullscreen-loading'
import { Board } from './components/Board'
import ConnectWallet from './components/ConnectWallet'
import { WinnerModal } from './components/WinnerModal'
import AlgorandService, { TicTacToeGameState } from './utils/AlgorandService'

interface HomeProps { }

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [gameState, setGameState] = useState<TicTacToeGameState | null>(null)
  const [squares, setSquares] = useState<Array<any>>(Array(9).fill(null))
  const [winner, setWinner] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (gameState?.playerXState !== undefined && gameState.playerOState !== undefined) {
      setSquares(getBoardSquares(gameState?.playerXState, gameState?.playerOState))
    }
  }, [gameState?.playerXState])

  useEffect(() => {
    if (gameState?.gameStatus !== undefined) {
      if (gameState.gameStatus == 1) {
        setWinner(true)
      }
    }
  }, [gameState?.gameStatus])

  function handlePlayer(i: number) {
    if (squares[i]) {
      return
    }
    playMove(i)
  }

  function handleNewGame() {
    setGameState(null)
    setWinner(false)
    setSquares(Array(9).fill(null))
  }

  function getBoardSquares(playerXState: number, playerOState: number): Array<string | null> {
    const squares = Array<string | null>(9).fill(null)

    for (let i = 0; i < 9; i++) {
      if ((playerXState & (1 << i)) !== 0) {
        squares[i] = 'X'
      }
      else if ((playerOState & (1 << i)) !== 0) {
        squares[i] = 'O'
      }
    }
    return squares
  }

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const handleDeployClick = async () => {
    setLoading(true)
    try {
      const deployParams = {
        onSchemaBreak: 'append',
        onUpdate: 'append',
      }
      await AlgorandService.deployContract(deployParams, activeAddress, signer).then((response) => {
        getApplicationState()
        enqueueSnackbar(`${response}`, { variant: 'success' })
      })
    } catch (error) {
      enqueueSnackbar(`Deployment failed: ${error.message}`, { variant: 'error' })
    }
    setLoading(false)
  }

  const handlePrize = async () => {
    setLoading(true)
    try {
      const response = await AlgorandService.payWinner()
      enqueueSnackbar(`${response}`, { variant: 'success' })
    } catch (error) {
      if (error.message.includes('overspend')) {
        enqueueSnackbar(`Transaction failed: Please fund the application account ${AlgorandService.appAddress}`, {
          variant: 'error',
        })
      } else {
        enqueueSnackbar(`Transaction failed: ${error.message}`, { variant: 'error' })
      }
    }
    setLoading(false)
  }

  const getApplicationState = async (): Promise<void> => {
    const state = await AlgorandService.getApplicationState()
    setGameState(state)
  }

  const playMove = async (positionIndex: number) => {
    setLoading(true)
    await AlgorandService.playActionLogic(positionIndex)
      .then(() => {
        enqueueSnackbar(`You sucessfully played the move!`, { variant: 'success' })
        getApplicationState()
        setLoading(false)
      })
      .catch((e: Error) => {
        enqueueSnackbar(`Error calling the contract: ${e.message}`, { variant: 'error' })
        setLoading(false)
      })
    setLoading(false)
  }

  return (
    <div className="hero min-h-screen bg-teal-400">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <div className="grid">
            <div className="flex rounded-lg bg-[#192a32] flex-col items-center ">
              {loading && <Loading loading loaderColor="#3498db" />}
              <h1 className="m-5 text-4xl md:text-6xl font-extrabold mt-4 text-[#30c4bd] ">
                Tic <span className="text-[#f3b236]">Tac </span> Toe
              </h1>
              {gameState?.gameStatus !== undefined && <Board squares={squares} handlePlayer={handlePlayer} />}
              {gameState?.gameStatus !== undefined && gameState?.gameStatus !== 0 && (
                <WinnerModal winnerNumber={gameState?.gameStatus} handleNewGame={handleNewGame} />
              )}
            </div>

            <button data-test-id="connect-wallet" className="btn mt-4 m-2 rounded-lg" onClick={toggleWalletModal}>
              Wallet Connection
            </button>

            {winner && (
              <button data-test-id="connect-wallet" className="btn m-2 rounded-lg" onClick={handlePrize}>
                Collect Prize
              </button>
            )}

            {activeAddress && (
              <button data-test-id="appcalls-demo" className="btn m-2 rounded-lg" onClick={handleDeployClick}>
                Deploy
              </button>
            )}
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        </div>
      </div>
    </div>
  )
}

export default Home
