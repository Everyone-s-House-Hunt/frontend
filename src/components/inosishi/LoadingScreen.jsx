import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import boarImg from '../../assets/boar-chasing.png'

export function LoadingScreen({ onStart }) {
  const boarRef = useRef(null)
  const popupRef = useRef(null)
  const [showPopup, setShowPopup] = useState(false)

  // イノシシの走りアニメーション（上下バウンス + 左右微回転でバタバタ感）
  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(boarRef.current, {
      y: -18,
      rotation: -2,
      duration: 0.18,
      ease: 'power1.inOut',
    }).to(boarRef.current, {
      y: 0,
      rotation: 2,
      duration: 0.18,
      ease: 'power1.inOut',
    })

    return () => tl.kill()
  }, [])

  // 2秒後に説明ポップアップをふわっと表示
  useEffect(() => {
    const t = setTimeout(() => setShowPopup(true), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!showPopup || !popupRef.current) return
    gsap.from(popupRef.current, {
      opacity: 0,
      scale: 0.92,
      duration: 0.5,
      ease: 'back.out(1.4)',
    })
  }, [showPopup])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 flex items-center justify-center">
      {/* イノシシ（背景を兼ねる） */}
      <img
        ref={boarRef}
        src={boarImg}
        alt="イノシシ"
        className="w-full h-full object-cover"
      />

      {/* 説明ポップアップ */}
      {showPopup && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div
            ref={popupRef}
            className="bg-white/85 rounded-2xl px-10 py-8 max-w-md w-4/5 text-center shadow-2xl"
          >
            <p className="text-gray-800 text-lg font-medium leading-relaxed">
              森で猪に遭遇してしまい、あなたは猪に追われています
              <br />
              二択問題をクリアして逃げ切りましょう
            </p>
            <button
              onClick={onStart}
              className="mt-6 px-8 py-3 bg-gray-800 text-white rounded-xl text-lg font-bold hover:bg-gray-700 active:scale-95 transition-transform"
            >
              スタート
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
