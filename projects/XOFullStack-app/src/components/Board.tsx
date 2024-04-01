import { OIcon } from './OIcon'
import { XIcon } from './XIcon'

interface PlayerProp {
  squares: Array<any>
  handlePlayer(i: number): void
}

interface SquareProp {
  value: JSX.Element | string | null
  onClick(): void
}

export const Board = ({ handlePlayer, squares }: PlayerProp) => {
  function Square({ value, onClick }: SquareProp) {
    return (
      <button className="square" onClick={onClick}>
        {value}
      </button>
    )
  }

  function value(i: number) {
    let value
    if (squares[i] === 'X') {
      value = <XIcon />
    } else if (squares[i] === 'O') {
      value = <OIcon />
    } else {
      value = null
    }

    return value
  }

  const renderSquare = (i: number) => {
    return <Square value={value(i)} onClick={() => handlePlayer(i)} />
  }

  return (
    <div>
      <div className="board">
        <div className="board-row">
          {renderSquare(0)}
          {renderSquare(1)}
          {renderSquare(2)}
        </div>

        <div className="board-row">
          {renderSquare(3)}
          {renderSquare(4)}
          {renderSquare(5)}
        </div>

        <div className="board-row">
          {renderSquare(6)}
          {renderSquare(7)}
          {renderSquare(8)}
        </div>
      </div>
    </div>
  )
}
