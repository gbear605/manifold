import clsx from 'clsx'
import Link from 'next/link'
import { Row } from '../layout/row'
import {
  formatLargeNumber,
  formatMoney,
  formatPercent,
} from 'common/util/format'
import {
  Contract,
  contractPath,
  getBinaryProbPercent,
  getBinaryProb,
} from 'web/lib/firebase/contracts'
import { Col } from '../layout/col'
import {
  Binary,
  CPMM,
  DPM,
  FreeResponse,
  FreeResponseContract,
  FullContract,
  NumericContract,
} from 'common/contract'
import {
  AnswerLabel,
  BinaryContractOutcomeLabel,
  FreeResponseOutcomeLabel,
  OUTCOME_TO_COLOR,
} from '../outcome-label'
import { getOutcomeProbability, getTopAnswer } from 'common/calculate'
import { AvatarDetails, MiscDetails } from './contract-details'
import { getExpectedValue, getValueFromBucket } from 'common/calculate-dpm'
import TriangleFillIcon from 'web/lib/icons/triangle-fill-icon'
import TriangleDownFillIcon from 'web/lib/icons/triangle-down-fill-icon'

// Return a number from 0 to 1 for this contract
// Resolved contracts are set to 1, for coloring purposes (even if NO)
function getProb(contract: Contract) {
  const { outcomeType, resolution } = contract
  return resolution
    ? 1
    : outcomeType === 'BINARY'
    ? getBinaryProb(contract)
    : outcomeType === 'FREE_RESPONSE'
    ? getOutcomeProbability(contract, getTopAnswer(contract)?.id || '')
    : outcomeType === 'NUMERIC'
    ? getNumericScale(contract as NumericContract)
    : 1 // Should not happen
}

function getNumericScale(contract: NumericContract) {
  const { min, max } = contract
  const ev = getExpectedValue(contract)
  return (ev - min) / (max - min)
}

function getColor(contract: Contract) {
  // TODO: Not sure why eg green-400 doesn't work here; try upgrading Tailwind
  // TODO: Try injecting a gradient here
  // return 'primary'
  const { resolution } = contract
  if (resolution) {
    return (
      // @ts-ignore; TODO: Have better typing for contract.resolution?
      OUTCOME_TO_COLOR[resolution] ||
      // If resolved to a FR answer, use 'primary'
      'primary'
    )
  }
  if (contract.outcomeType === 'NUMERIC') {
    return 'blue-400'
  }

  const marketClosed = (contract.closeTime || Infinity) < Date.now()
  return marketClosed
    ? 'gray-400'
    : getProb(contract) >= 0.5
    ? 'primary'
    : 'red-400'
}

export function ContractCard(props: {
  contract: Contract
  showHotVolume?: boolean
  showCloseTime?: boolean
  className?: string
}) {
  const { contract, showHotVolume, showCloseTime, className } = props
  const { question, outcomeType } = contract

  const prob = getProb(contract)
  const color = getColor(contract)
  const marketClosed = (contract.closeTime || Infinity) < Date.now()

  return (
    <div>
      <Col
        className={clsx(
          'relative gap-3 rounded-lg bg-white py-4 pl-6 pr-5 shadow-md hover:cursor-pointer hover:bg-gray-100',
          className
        )}
      >
        <Row>
          <Col className="relative flex-1 gap-3 pr-1">
            <AvatarDetails contract={contract} />
            <p
              className="break-words font-medium text-indigo-700"
              style={{ /* For iOS safari */ wordBreak: 'break-word' }}
            >
              {question}
            </p>

            {outcomeType === 'FREE_RESPONSE' && (
              <FreeResponseTopAnswer
                contract={contract as FullContract<DPM, FreeResponse>}
                truncate="long"
              />
            )}

            <MiscDetails
              contract={contract}
              showHotVolume={showHotVolume}
              showCloseTime={showCloseTime}
            />
            <Link href={contractPath(contract)}>
              {/* Note: Extends bg but not click target on closed markets */}
              <a
                className={clsx(
                  'absolute -left-6 -top-4 -bottom-4',
                  marketClosed ? 'right-[-6rem]' : 'right-0'
                )}
              />
            </Link>
          </Col>

          <Col className="relative -my-4 -mr-5 min-w-[6rem] justify-center gap-2 pr-5 pl-3 align-middle">
            {!marketClosed && (
              <div>
                <div
                  className="peer absolute top-0 left-0 right-0 h-[50%]"
                  onClick={() => {
                    console.log('success')
                  }}
                ></div>
                <div className="my-1 text-center text-xs text-transparent peer-hover:text-gray-400">
                  {formatMoney(20)}
                </div>

                {contract.createdTime % 3 == 0 ? (
                  <TriangleFillIcon
                    className={clsx(
                      'mx-auto h-5 w-5 text-opacity-60 peer-hover:text-opacity-100',
                      `text-${color}`
                    )}
                  />
                ) : (
                  <TriangleFillIcon className="mx-auto h-5 w-5 text-gray-200 peer-hover:text-gray-400" />
                )}
              </div>
            )}

            {outcomeType === 'BINARY' && (
              <BinaryResolutionOrChance
                className="items-center"
                contract={contract}
              />
            )}

            {outcomeType === 'NUMERIC' && (
              <NumericResolutionOrExpectation
                className="items-center"
                contract={contract as NumericContract}
              />
            )}

            {outcomeType === 'FREE_RESPONSE' && (
              <FreeResponseResolutionOrChance
                className="self-end text-gray-600"
                contract={contract as FullContract<DPM, FreeResponse>}
                truncate="long"
              />
            )}

            {!marketClosed && (
              <div>
                <div
                  className="peer absolute bottom-0 left-0 right-0 h-[50%]"
                  onClick={() => {
                  }}
                ></div>
                {contract.createdTime % 3 == 2 ? (
                  <TriangleDownFillIcon
                    className={clsx(
                      'mx-auto h-5 w-5 text-opacity-60 peer-hover:text-opacity-100',
                      `text-${color}`
                    )}
                  />
                ) : (
                  <TriangleDownFillIcon className="mx-auto h-5 w-5 text-gray-200 peer-hover:text-gray-400" />
                )}
                <div className="my-1 text-center text-xs text-transparent peer-hover:text-gray-400">
                  {formatMoney(20)}
                </div>
              </div>
            )}
          </Col>
        </Row>

        <div
          className={clsx(
            'absolute right-0 top-0 w-2 rounded-tr-md',
            'bg-gray-200'
          )}
          style={{ height: `${100 * (1 - prob)}%` }}
        ></div>
        <div
          className={clsx(
            'absolute right-0 bottom-0 w-2 rounded-br-md',
            `bg-${color}`,
            // If we're showing the full bar, also round the top
            prob === 1 ? 'rounded-tr-md' : ''
          )}
          style={{ height: `${100 * prob}%` }}
        ></div>
      </Col>
    </div>
  )
}

export function BinaryResolutionOrChance(props: {
  contract: FullContract<DPM | CPMM, Binary>
  large?: boolean
  className?: string
}) {
  const { contract, large, className } = props
  const { resolution } = contract
  const textColor = `text-${getColor(contract)}`

  return (
    <Col className={clsx(large ? 'text-4xl' : 'text-3xl', className)}>
      {resolution ? (
        <>
          <div
            className={clsx('text-gray-500', large ? 'text-xl' : 'text-base')}
          >
            Resolved
          </div>
          <BinaryContractOutcomeLabel
            contract={contract}
            resolution={resolution}
          />
        </>
      ) : (
        <>
          <div className={textColor}>{getBinaryProbPercent(contract)}</div>
        </>
      )}
    </Col>
  )
}

function FreeResponseTopAnswer(props: {
  contract: FreeResponseContract
  truncate: 'short' | 'long' | 'none'
  className?: string
}) {
  const { contract, truncate } = props
  const { resolution } = contract

  const topAnswer = getTopAnswer(contract)

  return topAnswer ? (
    <AnswerLabel
      className="!text-gray-600"
      answer={topAnswer}
      truncate={truncate}
    />
  ) : null
}

export function FreeResponseResolutionOrChance(props: {
  contract: FreeResponseContract
  truncate: 'short' | 'long' | 'none'
  className?: string
}) {
  const { contract, truncate, className } = props
  const { resolution } = contract

  const topAnswer = getTopAnswer(contract)
  const textColor = `text-${getColor(contract)}`

  return (
    <Col className={clsx(resolution ? 'text-3xl' : 'text-xl', className)}>
      {resolution ? (
        <>
          <div className={clsx('text-base text-gray-500')}>Resolved</div>
          <FreeResponseOutcomeLabel
            contract={contract}
            resolution={resolution}
            truncate={truncate}
            answerClassName="text-xl"
          />
        </>
      ) : (
        topAnswer && (
          <Row className="items-center gap-6">
            <Col className={clsx('text-3xl', textColor)}>
              <div>
                {formatPercent(getOutcomeProbability(contract, topAnswer.id))}
              </div>
            </Col>
          </Row>
        )
      )}
    </Col>
  )
}

export function NumericResolutionOrExpectation(props: {
  contract: NumericContract
  className?: string
}) {
  const { contract, className } = props
  const { resolution } = contract
  const textColor = `text-${getColor(contract)}`

  const resolutionValue =
    contract.resolutionValue ?? getValueFromBucket(resolution ?? '', contract)

  return (
    <Col className={clsx(resolution ? 'text-3xl' : 'text-xl', className)}>
      {resolution ? (
        <>
          <div className={clsx('text-base text-gray-500')}>Resolved</div>
          <div className="text-blue-400">{resolutionValue}</div>
        </>
      ) : (
        <>
          <div className={clsx('text-3xl', textColor)}>
            {formatLargeNumber(getExpectedValue(contract))}
          </div>
        </>
      )}
    </Col>
  )
}
