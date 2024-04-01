interface GameProps {
  winnerNumber: number
  handleNewGame(): void
}

export const WinnerModal = ({ winnerNumber, handleNewGame }: GameProps) => {
  let content
  switch (winnerNumber) {
    case 1:
      content = (<><p className="uppercase text-[#30c4bd]">X Takes the Round</p></>)
      break
    case 2:
      content = (<><p className="uppercase text-[#30c4bd]">O Takes the Round</p></>)
      break
    case 3:
      content = <p className="uppercase text-[#f3b236]">It's a tie!</p>
      break
    default:
      content = <p className="text-[#f3b236]">Invalid state</p>
  }

  return (
    <div className="z-10 w-full absolute top-0 left-0">
      <div className="w-[500px] h-[250px] rounded-xl bg-[#1f3540] space-y-10 px-6 py-4 mx-auto mt-52 flex items-center justify-center flex-col">
        <h2 className="flex flex-col items-center justify-center space-y-6 text-2xl md:text-4xl font-bold">{content}</h2>
        <div className="flex items-center justify-center space-x-16">
          <button
            onClick={handleNewGame}
            className="button px-4 rounded-md py-1 bg-[#f3b236] hover:bg-[#30c4bd] hover:ring-4 hover:ring-cyan-300"
          >
            Next Round
          </button>
        </div>
      </div>
    </div>
  )
}
