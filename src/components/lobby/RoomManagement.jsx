import { useEffect, useState } from 'react'
import background from '../../assets/brain-survival-background.jpeg'
import membersPanel from '../../assets/room-members-panel.png'
import { RoomSettingsPanel } from './RoomSettingsPanel'

const STAGE_WIDTH = 1062
const STAGE_HEIGHT = 1024
const STAGE_MARGIN = 32

function calculateStageScale() {
  if (typeof window === 'undefined') return 1

  const viewport = window.visualViewport
  const width = viewport?.width ?? window.innerWidth
  const height = viewport?.height ?? window.innerHeight

  return Math.min(
    (width - STAGE_MARGIN) / STAGE_WIDTH,
    (height - STAGE_MARGIN) / STAGE_HEIGHT,
    1,
  )
}

export function RoomManagement({
  room,
  settings,
  onSettingsChange,
  onStartGame,
  onBackToTitle,
  loading,
  error,
}) {
  const [stageScale, setStageScale] = useState(calculateStageScale)

  useEffect(() => {
    function updateStageScale() {
      setStageScale(calculateStageScale())
    }

    updateStageScale()
    window.addEventListener('resize', updateStageScale)
    window.visualViewport?.addEventListener('resize', updateStageScale)

    return () => {
      window.removeEventListener('resize', updateStageScale)
      window.visualViewport?.removeEventListener('resize', updateStageScale)
    }
  }, [])

  return (
    <main className="relative h-screen min-h-[720px] overflow-hidden bg-[#170e3e]">
      <div className="relative h-full min-h-[720px] w-full overflow-hidden">
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />

        <div
          className="room-management-stage absolute left-1/2 top-1/2 z-10 pt-20"
          style={{ '--room-management-scale': stageScale }}
        >
          <header className="text-center">
            <h1 className="text-[64px] font-black leading-[80px] text-black drop-shadow-[3px_3px_0_white]">
              ルーム管理
            </h1>
            <p className="text-xl font-black leading-[22px] text-white">
              ルームID ：{room.roomId}
            </p>
          </header>

          <div className="mt-6 flex items-start gap-[54px]">
            <section className="relative h-[713px] w-[495px] shrink-0" aria-label="参加状況">
              <img src={membersPanel} alt="" className="absolute inset-0 h-full w-full object-fill" />
              <h2 className="absolute inset-x-0 top-[118px] text-center text-[32px] font-black leading-10 text-black">
                メンバー
              </h2>
              <p className="absolute inset-x-0 top-[197px] text-center text-2xl font-black leading-[37px] text-black">
                ホスト：{room.hostName}
              </p>
              <div className="absolute left-1/2 top-[254px] h-[300px] w-[300px] -translate-x-1/2 bg-white/50 px-6 py-5">
                {room.members.map((member, index) => (
                  <p
                    key={`${member}-${index}`}
                    className="whitespace-nowrap text-center text-2xl font-black leading-[64px] text-black"
                  >
                    {index === 0 ? member : `メンバー${index}：${member}`}
                  </p>
                ))}
              </div>
            </section>

            <div className="flex flex-col items-center">
              <RoomSettingsPanel value={settings} onChange={onSettingsChange} />
            </div>
          </div>

          {error && (
            <p className="absolute bottom-[152px] left-1/2 -translate-x-1/2 text-lg font-black text-red-700">
              {error}
            </p>
          )}

          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center justify-center gap-8">
            <button
              type="button"
              onClick={onBackToTitle}
              disabled={loading}
              className="flex h-20 w-[300px] items-center justify-center whitespace-nowrap border-[4px] border-black bg-[#fff36d] p-2 text-3xl font-black leading-[22px] text-black shadow-[5px_5px_0_rgba(255,255,255,0.95)] transition hover:bg-[#ffe33d] disabled:cursor-wait disabled:opacity-50"
            >
              タイトルへ戻る
            </button>

            <button
              type="button"
              onClick={onStartGame}
              disabled={loading}
              className="flex h-20 w-[300px] items-center justify-center whitespace-nowrap border-[3px] border-white bg-white/70 p-2 text-4xl font-black leading-[22px] text-black opacity-95 backdrop-blur-sm transition hover:bg-white/85 disabled:cursor-wait disabled:opacity-50"
            >
              {loading ? '開始中...' : 'ゲームスタート'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
