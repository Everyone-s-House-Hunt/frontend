import { useState, useEffect, useRef } from 'react'
import road1 from '../../assets/1.jpeg'
import road2 from '../../assets/2.jpeg'
import road3 from '../../assets/3.jpeg'
import road4 from '../../assets/4.jpeg'
import road5 from '../../assets/5.jpeg'
import wrongImg from '../../assets/wrong.jpeg'
import { useRoadAnimation } from '../../hooks/useRoadAnimation'
import { ChoicePanel } from './ChoicePanel'

const ROAD_IMAGES = { 1: road1, 2: road2, 3: road3, 4: road4, 5: road5 }
const FADE_DURATION = 700
const STEP5_DURATION = 1500  // ステップ5を見せる時間
const WRONG_DURATION = 2500  // wrong.jpegを見せる時間

export function RoadScreen({ question, onAnswer }) {
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [showWrong, setShowWrong] = useState(false)

  const onAnswerRef = useRef(onAnswer)
  onAnswerRef.current = onAnswer

  // タイムアウト: wrong.jpegを表示して停止
  function handleTimeout() {
    setShowWrong(true)
  }

  const { roadStep, countdown, select } = useRoadAnimation(handleTimeout)

  // ディゾルブ用レイヤー管理
  const [layers, setLayers] = useState({ bottom: roadStep, top: roadStep, animating: false })
  const topStepRef = useRef(roadStep)

  useEffect(() => {
    if (topStepRef.current === roadStep) return
    const prevTop = topStepRef.current
    topStepRef.current = roadStep
    setLayers({ bottom: prevTop, top: roadStep, animating: true })
    const t = setTimeout(() => {
      setLayers({ bottom: roadStep, top: roadStep, animating: false })
    }, FADE_DURATION + 100)
    return () => { clearTimeout(t) }
  }, [roadStep])

  function handleChoice(choice) {
    setSelectedChoice(choice)
    select() // ステップ5へ

    const isCorrect = choice === question.correctAnswer
    if (isCorrect) {
      // 正解: ステップ5を見せてから次の問題へ
      setTimeout(() => onAnswerRef.current(true), STEP5_DURATION)
    } else {
      // 不正解: ステップ5を見せてからwrong.jpegで停止
      setTimeout(() => setShowWrong(true), STEP5_DURATION)
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 下レイヤー: 常に表示 */}
      <img
        src={ROAD_IMAGES[layers.bottom]}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 上レイヤー: ディゾルブ中だけ表示 */}
      {layers.animating && (
        <img
          key={layers.top}
          src={ROAD_IMAGES[layers.top]}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: `dissolve ${FADE_DURATION}ms ease-in-out forwards` }}
        />
      )}

      {/* wrong.jpeg: ディゾルブで上から覆う */}
      {showWrong && (
        <img
          key="wrong"
          src={wrongImg}
          className="absolute inset-0 w-full h-full object-cover z-30"
          style={{ animation: `dissolve ${FADE_DURATION}ms ease-in-out forwards` }}
        />
      )}

      {/* 問題文ボックス: ステップ1〜4 */}
      {roadStep <= 4 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4/5 bg-white/85 rounded-xl py-3 px-6 z-20">
          <p className="text-center text-xl font-bold text-gray-800">{question.text}</p>
        </div>
      )}

      {/* ステップ1〜3: プレート画像 + テキスト（クリック不可） */}
      {roadStep <= 3 && (
        <div className="absolute inset-0 flex items-end justify-center gap-40 pb-24 pointer-events-none z-10">
          <ChoicePanel choice={question.choices[0]} />
          <ChoicePanel choice={question.choices[1]} />
        </div>
      )}

      {/* ステップ4: テキストのみ + クリックエリア */}
      {roadStep === 4 && (
        <>
          <div className="absolute top-24 left-1/2 -translate-x-1/2 text-white text-7xl font-bold drop-shadow-lg z-20">
            {countdown}
          </div>
          <div className="absolute left-[14.5%] top-[40%] -translate-y-1/2 w-[28%] flex items-center justify-center pointer-events-none z-10">
            <ChoicePanel choice={question.choices[0]} textOnly className="text-gray-800" />
          </div>
          <div className="absolute right-[14.5%] top-[40%] -translate-y-1/2 w-[28%] flex items-center justify-center pointer-events-none z-10">
            <ChoicePanel choice={question.choices[1]} textOnly className="text-gray-800" />
          </div>
          <button
            onClick={() => handleChoice(question.choices[0])}
            className="absolute left-[18%] top-[45%] -translate-y-1/2 w-[28%] h-[40%] z-10"
          />
          <button
            onClick={() => handleChoice(question.choices[1])}
            className="absolute right-[18%] top-[45%] -translate-y-1/2 w-[28%] h-[40%] z-10"
          />
        </>
      )}

      {/* ステップ5: 選んだ選択肢のみ表示 */}
      {roadStep === 5 && selectedChoice && (
        <div className="absolute inset-0 flex items-start justify-start pl-[46%] pt-44 z-20">
          <ChoicePanel choice={selectedChoice} textOnly className="text-gray-800" />
        </div>
      )}
    </div>
  )
}
