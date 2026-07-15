import { useEffect, useState } from 'react'
import background from '../../assets/brain-survival-background.jpeg'
import membersPanel from '../../assets/room-members-panel.png'
import { RoomSettingsPanel } from './RoomSettingsPanel'

// 1062x1024 の固定レイアウト（ステージ）をビューポートに収まるよう縮小する
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

// 招待URLの表示とコピー。表示は一時的に無効化中。戻すときは下のコメントを解除し、
// `import { useState } from 'react'` を先頭に足す。
// モック: 今は招待トークン＝ルームID。将来はバックエンドが発行する招待トークンに差し替える。
function InviteUrl() {
  return null
  // const [copied, setCopied] = useState(false)
  // const inviteUrl = `${window.location.origin}/join/${roomId}`
  //
  // async function handleCopy() {
  //   try {
  //     await navigator.clipboard.writeText(inviteUrl)
  //     setCopied(true)
  //     window.setTimeout(() => setCopied(false), 2000)
  //   } catch {
  //     // コピー失敗時は何もしない（URLは表示されているので手動コピーできる）
  //   }
  // }
  //
  // return (
  //   <p className="mt-2 flex items-center justify-center gap-3 text-lg font-black text-white">
  //     <span>招待URL ：{inviteUrl}</span>
  //     <button
  //       type="button"
  //       onClick={handleCopy}
  //       className="border-2 border-white bg-white/60 px-3 py-0.5 text-sm text-black transition hover:bg-white/75"
  //     >
  //       {copied ? 'コピーしました！' : 'コピー'}
  //     </button>
  //   </p>
  // )
}

// ルームIDの表示と招待URLのコピー。ボタンは「クリックだけで参加できるURL」をコピーする。
// モック: 今は招待トークン＝ルームID。将来はバックエンドが発行する招待トークンに差し替える。
function RoomIdLine({ roomId }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // コピー失敗時は何もしない（IDは表示されているので口頭やルーム参加ポップアップで共有できる）
    }
  }

  return (
    <p className="flex items-center justify-center gap-3 text-xl font-black leading-[22px] text-white">
      <span>ルームID ：{roomId}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="border-2 border-white bg-white/60 px-3 py-0.5 text-sm text-black transition hover:bg-white/75"
      >
        {copied ? 'コピーしました！' : '招待URLをコピー'}
      </button>
    </p>
  )
}

// メンバー1行分。「ラベル：名前」で表示し、自分の行だけ名前をクリックすると編集できる。
function MemberRow({ label, name, isSelf, onRename, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(name)
    setEditing(true)
  }

  function commit() {
    const next = draft.trim()
    setEditing(false)
    if (next && next !== name) onRename(next)
  }

  return (
    <p className={`whitespace-nowrap text-center text-2xl font-black text-black ${className}`}>
      {label}：
      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          maxLength={8}
          autoFocus
          className="w-40 border-b-4 border-black bg-white/70 text-center text-2xl font-black text-black outline-none"
        />
      ) : isSelf ? (
        <button
          type="button"
          onClick={startEdit}
          title="クリックで名前を変更"
          className="underline decoration-2 underline-offset-4 transition hover:opacity-60"
        >
          {name}
        </button>
      ) : (
        name
      )}
    </p>
  )
}

export function RoomManagement({
  room,
  settings,
  onSettingsChange,
  onStartGame,
  onBackToTitle,
  onRename,
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
            <h1 className="heading-outline text-[64px] font-black leading-[80px] text-black">
              ルーム管理
            </h1>
            <RoomIdLine roomId={room.roomId} />
            <InviteUrl roomId={room.roomId} />
          </header>

          <div className="mt-6 flex items-start gap-[54px]">
            {/* パネルPNGは上10.4%が透過余白で、ゲームモードパネル（透過6.7%）より見た目の上端が低い。
                画像だけ上に伸ばして表示し（下端は不変）、視覚上の上端を右カラムと揃える。 */}
            <section className="relative h-[713px] w-[495px] shrink-0" aria-label="参加状況">
              <img src={membersPanel} alt="" className="absolute -top-[59px] left-0 h-[778px] w-full object-fill" />
              <h2 className="heading-outline-sm absolute inset-x-0 top-[65px] text-center text-[32px] font-black leading-10 text-black">
                メンバー
              </h2>
              {/* ホストはこの行のみに表示。自分がホストならここで名前を変更できる */}
              <MemberRow
                label="ホスト"
                name={room.hostName}
                isSelf={room.isHost}
                onRename={onRename}
                className="absolute inset-x-0 top-[144px] leading-[37px]"
              />
              {/* 下の枠はホストを除いたメンバー1〜4のみ表示する */}
              <div className="absolute left-1/2 top-[201px] h-[353px] w-[300px] -translate-x-1/2 bg-white/50 px-6 py-5">
                {(room.players ?? [])
                  .filter((p) => p.nickname && !p.is_host) // 入室処理前の接続者とホストは表示しない
                  .map((p, index) => (
                    <MemberRow
                      key={p.player_id}
                      label={`メンバー${index + 1}`}
                      name={p.nickname}
                      isSelf={p.player_id === room.playerId}
                      onRename={onRename}
                      className="leading-[64px]"
                    />
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
              <span className="heading-outline-sm">{loading ? '開始中...' : 'ゲームスタート'}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
