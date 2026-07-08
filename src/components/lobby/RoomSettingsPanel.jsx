import gameModePanel from '../../assets/game-mode-panel.png'
import questionSourcePanel from '../../assets/question-source-panel.png'

const GAME_MODES = [
  { value: 'zombieBullet', label: 'ゾンビバレット' },
  { value: 'wordPiece', label: 'コトバピース' },
  { value: 'fiveTours', label: 'ファイブツアーズ' },
  { value: 'boarPanic', label: 'イノシシパニック' },
]

const QUESTION_SOURCES = [
  { value: 'random', label: 'おまかせ' },
  { value: 'official', label: '公式' },
  { value: 'community', label: '他人のオリジナル' },
  { value: 'mine', label: '自分のオリジナル' },
]

function OptionGrid({ items, selectedValue, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-10">
      {items.map((item) => {
        const selected = selectedValue === item.value

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className="group flex min-h-7 items-center gap-2 text-left"
            aria-pressed={selected}
          >
            <span className="relative grid size-5 shrink-0 place-items-center border-2 border-black bg-white/80">
              {selected && (
                <span className="absolute -left-0.5 -top-1 text-2xl font-black leading-none text-red-600 drop-shadow-[1px_1px_0_white]">
                  ✓
                </span>
              )}
            </span>
            <span className="whitespace-nowrap text-xl font-black leading-none text-black drop-shadow-[2px_2px_0_rgba(255,255,255,0.65)]">
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function RoomSettingsPanel({ value, onChange }) {
  function update(nextValue) {
    onChange({ ...value, ...nextValue })
  }

  return (
    <section className="flex w-[576px] flex-col gap-8" aria-label="ルーム設定">
      <div className="relative h-80 w-full">
        <img
          src={gameModePanel}
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
        />
        <div className="heading-outline-sm absolute inset-x-0 top-[66px] text-center text-[32px] font-black leading-10 text-black">
          ゲームモード
        </div>
        <div className="absolute left-1/2 top-[132px] w-[383px] -translate-x-1/2">
          <OptionGrid
            items={GAME_MODES}
            selectedValue={value.gameMode}
            onSelect={(gameMode) => update({ gameMode })}
          />
        </div>
      </div>

      <div className="relative h-[323px] w-full">
        <img
          src={questionSourcePanel}
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
        />
        <div className="heading-outline-sm absolute inset-x-0 top-[66px] text-center text-[32px] font-black leading-10 text-black">
          問題
        </div>
        <div className="absolute left-1/2 top-[132px] w-[383px] -translate-x-1/2">
          <OptionGrid
            items={QUESTION_SOURCES}
            selectedValue={value.questionSource}
            onSelect={(questionSource) => update({ questionSource })}
          />
        </div>
      </div>
    </section>
  )
}
