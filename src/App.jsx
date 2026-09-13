import { useState } from 'react'

function Calculator() {
  const [displayValue, setDisplayValue] = useState('0')
  const [firstOperand, setFirstOperand] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const performCalculation = (leftOperand, rightOperand, selectedOperator) => {
    switch (selectedOperator) {
      case '+':
        return leftOperand + rightOperand
      case '-':
        return leftOperand - rightOperand
      case '×':
        return leftOperand * rightOperand
      case '÷':
        return rightOperand === 0 ? null : leftOperand / rightOperand
      default:
        return rightOperand
    }
  }

  const formatResult = (result) => {
    if (result === null || !Number.isFinite(result)) return 'Error'
    return String(Number(result.toPrecision(12)))
  }

  const handleNumber = (number) => {
    if (displayValue === 'Error' || waitingForOperand) {
      setDisplayValue(number)
      setWaitingForOperand(false)
      return
    }

    setDisplayValue((currentValue) =>
      currentValue === '0' ? number : currentValue + number,
    )
  }

  const handleDecimal = () => {
    if (displayValue === 'Error' || waitingForOperand) {
      setDisplayValue('0.')
      setWaitingForOperand(false)
      return
    }

    if (!displayValue.includes('.')) {
      setDisplayValue((currentValue) => currentValue + '.')
    }
  }

  const clearCalculator = () => {
    setDisplayValue('0')
    setFirstOperand(null)
    setOperator(null)
    setWaitingForOperand(false)
  }

  const deleteNumber = () => {
    if (waitingForOperand || displayValue === 'Error') {
      setDisplayValue('0')
      setWaitingForOperand(false)
      return
    }

    setDisplayValue((currentValue) =>
      currentValue.length > 1 ? currentValue.slice(0, -1) : '0',
    )
  }

  const percentage = () => {
    if (displayValue === 'Error') return
    setDisplayValue(formatResult(Number(displayValue) / 100))
  }

  const handleOperator = (nextOperator) => {
    if (displayValue === 'Error') return

    const inputValue = Number(displayValue)

    if (operator && waitingForOperand) {
      setOperator(nextOperator)
      return
    }

    if (firstOperand === null) {
      setFirstOperand(inputValue)
    } else if (operator) {
      const result = performCalculation(firstOperand, inputValue, operator)

      if (result === null) {
        clearCalculator()
        setDisplayValue('Error')
        return
      }

      setDisplayValue(formatResult(result))
      setFirstOperand(result)
    }

    setOperator(nextOperator)
    setWaitingForOperand(true)
  }

  const calculate = () => {
    if (!operator || firstOperand === null || waitingForOperand) return

    const result = performCalculation(firstOperand, Number(displayValue), operator)

    if (result === null) {
      clearCalculator()
      setDisplayValue('Error')
      return
    }

    setDisplayValue(formatResult(result))
    setFirstOperand(null)
    setOperator(null)
    setWaitingForOperand(true)
  }

  const displayText =
    operator && firstOperand !== null
      ? `${formatResult(firstOperand)} ${operator}${
          waitingForOperand ? '' : ` ${displayValue}`
        }`
      : displayValue

  return (
    <div className="calculator">
      <div className="display" aria-live="polite">
        {displayText}
      </div>

      <div className="buttons">
        <button type="button" className="function" onClick={deleteNumber} aria-label="Delete">
          DEL
        </button>

        <button type="button" className="function" onClick={clearCalculator} aria-label="Clear calculator">
          AC
        </button>

        <button type="button" className="function" onClick={percentage} aria-label="Percentage">
          %
        </button>

        <button type="button" className="operator" onClick={() => handleOperator('÷')} aria-label="Divide">
          ÷
        </button>

        <button type="button" onClick={() => handleNumber('7')}>7</button>
        <button type="button" onClick={() => handleNumber('8')}>8</button>
        <button type="button" onClick={() => handleNumber('9')}>9</button>

        <button type="button" className="operator" onClick={() => handleOperator('×')} aria-label="Multiply">
          ×
        </button>

        <button type="button" onClick={() => handleNumber('4')}>4</button>
        <button type="button" onClick={() => handleNumber('5')}>5</button>
        <button type="button" onClick={() => handleNumber('6')}>6</button>

        <button type="button" className="operator" onClick={() => handleOperator('-')} aria-label="Subtract">
          -
        </button>

        <button type="button" onClick={() => handleNumber('1')}>1</button>
        <button type="button" onClick={() => handleNumber('2')}>2</button>
        <button type="button" onClick={() => handleNumber('3')}>3</button>

        <button type="button" className="operator" onClick={() => handleOperator('+')} aria-label="Add">
          +
        </button>

        <button type="button" className="zero" onClick={() => handleNumber('0')}>
          0
        </button>

        <button type="button" onClick={handleDecimal} aria-label="Decimal">
          .
        </button>

        <button type="button" className="operator" onClick={calculate} aria-label="Calculate">
          =
        </button>
      </div>
    </div>
  )
}

export default Calculator
