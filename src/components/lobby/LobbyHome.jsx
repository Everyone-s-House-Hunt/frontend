import background from '../../assets/brain-survival-background.jpeg'
import createCard from '../../assets/menu-card-create.png'
import joinCard from '../../assets/menu-card-join.png'
import settingsCard from '../../assets/menu-card-settings.png'
import circleGreen from '../../assets/deco-circle-green.png'
import crossOrange from '../../assets/deco-cross-orange.png'
import questionBlue from '../../assets/deco-question-blue.png'
import questionPink from '../../assets/deco-question-pink.png'
import plusIcon from '../../assets/icon-plus.svg'
import doorIcon from '../../assets/icon-door-enter.svg'
import gearIcon from '../../assets/icon-gear.svg'

const CARD_CONFIG = [
  {
    title: 'ルーム作成',
    subtitle: '新しいルームを作る',
    image: createCard,
    icon: plusIcon,
    on: 'onCreateRoom',
  },
  {
    title: 'ルーム参加',
    subtitle: 'ルームIDで参加する',
    image: joinCard,
    icon: doorIcon,
    on: 'onOpenJoin',
  },
  {
    title: '設定',
    subtitle: '',
    image: settingsCard,
    icon: gearIcon,
    on: null,
  },
]

function MenuCard({ card, onCreateRoom, onOpenJoin, disabled }) {
  const handler = card.on === 'onCreateRoom' ? onCreateRoom : onOpenJoin

  return (
    <button
      type="button"
      onClick={handler}
      disabled={disabled || !card.on}
      className="relative h-[250px] w-[330px] shrink-0 transition-transform enabled:hover:-translate-y-1 enabled:active:translate-y-0 disabled:cursor-default"
    >
      <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-fill" />
      <img
        src={card.icon}
        alt=""
        className="absolute left-1/2 top-[52px] size-20 -translate-x-1/2"
      />
      <span className="absolute inset-x-0 top-[138px] text-center text-[34px] font-black leading-10 text-white drop-shadow-[3px_3px_0_rgba(36,73,210,0.95)]">
        {card.title}
      </span>
      {card.subtitle && (
        <span className="absolute inset-x-0 top-[186px] text-center text-xl font-black leading-6 text-white">
          {card.subtitle}
        </span>
      )}
    </button>
  )
}

export function LobbyHome({ onCreateRoom, onOpenJoin, loading, error }) {
  return (
    <main className="relative h-screen min-h-[720px] overflow-hidden bg-[#170e3e]">
      <div className="relative h-full min-h-[720px] w-full overflow-hidden">
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />

        <img src={circleGreen} alt="" className="absolute left-[9%] top-[8%] size-[150px]" />
        <img src={questionBlue} alt="" className="absolute right-[10%] top-[3%] size-[150px] rotate-[18deg]" />
        <img src={crossOrange} alt="" className="absolute right-[3%] top-[31%] size-[176px] rotate-[11deg]" />
        <img src={questionPink} alt="" className="absolute left-[2%] top-[43%] size-[150px] -rotate-[21deg]" />

        <div className="relative z-10 flex min-h-screen flex-col items-center px-10 pb-[10vh] pt-[11vh]">
          <div className="text-center">
            <h1 className="lobby-title text-[clamp(76px,8.4vw,128px)] font-black leading-[0.78] text-black">
              <span className="block -translate-x-32 -rotate-6">ブレイン</span>
              <span className="block translate-x-32">サバイバル</span>
            </h1>
            <p className="mx-auto mt-12 max-w-[920px] text-center text-2xl font-black leading-[30px] text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.75)]">
              友達とブラウザで遊べるリアルタイム協力クイズ！
              <br />
              みんなで知識を持ち寄って正解を繋げ、全ステージ生き残りを目指せ！
            </p>
          </div>

          <div className="mt-[9vh] flex items-center justify-center gap-8">
            {CARD_CONFIG.map((card) => (
              <MenuCard
                key={card.title}
                card={card}
                onCreateRoom={onCreateRoom}
                onOpenJoin={onOpenJoin}
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <p className="mt-6 text-center text-xl font-black text-red-400 drop-shadow-[2px_2px_0_rgba(0,0,0,0.75)]">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
