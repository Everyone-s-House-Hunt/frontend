// 背景動画 + オーバーレイの表示のみ。ロジックは useVideoSequence 側にある
export function VideoStage({ src, token, visible, fadeMs, onReady, onEnded, children }) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <video
        key={token}
        src={src}
        autoPlay
        muted
        playsInline
        onCanPlay={onReady}
        onEnded={onEnded}
        className="absolute inset-0 w-full h-full object-cover transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
      />
      {/* オーバーレイ（プレート等）も動画と一緒にフェードさせる */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
      >
        {children}
      </div>
    </div>
  )
}
