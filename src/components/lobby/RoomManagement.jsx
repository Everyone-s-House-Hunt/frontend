import background from '../../assets/brain-survival-background.jpeg'
import membersPanel from '../../assets/room-members-panel.png'
import { RoomSettingsPanel } from './RoomSettingsPanel'

export function RoomManagement({
  room,
  settings,
  onSettingsChange,
  onStartGame,
  loading,
  error,
}) {
  return (
    <main className="relative min-h-screen overflow-auto bg-[#170e3e]">
      <div className="relative mx-auto min-h-[720px] w-full min-w-[1024px] max-w-[1440px] overflow-hidden">
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />

        <div className="room-management-stage relative z-10 mx-auto min-h-[1024px] w-[1062px] pt-20">
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
            <p className="absolute bottom-[98px] left-1/2 -translate-x-1/2 text-lg font-black text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onStartGame}
            disabled={loading}
            className="absolute bottom-16 left-1/2 flex h-20 w-[300px] -translate-x-1/2 items-center justify-center whitespace-nowrap border-[3px] border-white bg-white/60 p-2 text-4xl font-black leading-[22px] text-black opacity-90 backdrop-blur-sm transition hover:bg-white/75 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? '開始中...' : 'ゲームスタート'}
          </button>
        </div>
      </div>
    </main>
  )
}
