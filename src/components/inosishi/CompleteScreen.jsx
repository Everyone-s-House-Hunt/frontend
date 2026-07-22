import completeImg from '../../assets/gamecomplete.png'

// ゲームクリア画面（表示のみ）
// デザイン画像に「ルームに戻る」ボタンが埋め込み済みなので、
// 描画はせず埋め込みボタンの位置に透明なクリック判定だけを重ねる。
// 画像はobject-cover相当のラッパー（アスペクト比986:703固定）で表示し、
// 判定をラッパー基準の%で置くことでどの画面サイズでも位置がズレない。
export function CompleteScreen({ onBackToRoom }) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full"
        style={{ aspectRatio: '986 / 703' }}
      >
        <img src={completeImg} alt="ゲームクリア!" className="w-full h-full" />
        {/* 埋め込みボタン（中央下部）の当たり判定。ホバーでうっすら光らせる */}
        <button
          aria-label="ルームに戻る"
          onClick={onBackToRoom}
          className="absolute cursor-pointer rounded-sm hover:bg-white/15 active:bg-white/25 transition-colors"
          style={{ left: '36%', top: '77.5%', width: '28%', height: '9.5%' }}
        />
      </div>
    </div>
  )
}
