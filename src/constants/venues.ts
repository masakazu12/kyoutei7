import { AppSettings, VenueInfo } from '../types/kyotei';

// 全国主要43競輪場データ (周長・みなし直線・カント・バンク特性)
export const VENUES: VenueInfo[] = [
  // 北日本
  { code: '11', name: '函館', region: '北日本', bankLength: 400, straightLength: 51.3, cantAngle: 30.3, waterType: '標準走路', characteristics: '海風あり・直線標準的・捲り届く' },
  { code: '12', name: '青森', region: '北日本', bankLength: 400, straightLength: 58.9, cantAngle: 32.2, waterType: '標準走路', characteristics: 'みなし直線長め・外伸び良好・イエローライン外強襲' },
  { code: '13', name: 'いわき平', region: '北日本', bankLength: 400, straightLength: 62.7, cantAngle: 32.5, waterType: '標準走路', characteristics: '日本唯一の空中バンク・直線長く捲り追い込み有利' },

  // 関東
  { code: '21', name: '弥彦', region: '関東', bankLength: 400, straightLength: 63.1, cantAngle: 32.2, waterType: '標準走路', characteristics: '直線長く追い込み有利・風が吹き込む' },
  { code: '22', name: '前橋', region: '関東', bankLength: 335, straightLength: 46.7, cantAngle: 36.0, waterType: 'ドーム', characteristics: '全天候ドーム・日本一の急カント超高速バンク・先行・捲り圧倒' },
  { code: '23', name: '取手', region: '関東', bankLength: 400, straightLength: 54.8, cantAngle: 31.3, waterType: '標準走路', characteristics: '利根川沿い・風の影響大・クセの少ない標準バンク' },
  { code: '24', name: '宇都宮', region: '関東', bankLength: 500, straightLength: 63.3, cantAngle: 25.5, waterType: '長走路', characteristics: '500m長走路・直線長く自力選手受難・番手差し強襲' },
  { code: '25', name: '大宮', region: '関東', bankLength: 500, straightLength: 66.7, cantAngle: 26.5, waterType: '長走路', characteristics: '直線長い500m・先行受難・3番手まで届く差しバンク' },
  { code: '26', name: '西武園', region: '関東', bankLength: 400, straightLength: 47.6, cantAngle: 29.3, waterType: '標準走路', characteristics: '直線短く先行有利・すり鉢状で早めの仕掛け必須' },
  { code: '27', name: '京王閣', region: '関東', bankLength: 400, straightLength: 51.5, cantAngle: 32.1, waterType: '標準走路', characteristics: '多摩川沿い・ナイター照明良好・カントあり捲り決まる' },
  { code: '28', name: '立川', region: '関東', bankLength: 400, straightLength: 58.0, cantAngle: 31.2, waterType: '標準走路', characteristics: 'グランプリ聖地・直線長く外伸びる・冬場は重いバンク' },

  // 南関東
  { code: '31', name: '松戸', region: '南関東', bankLength: 333, straightLength: 38.2, cantAngle: 29.5, waterType: '短走路', characteristics: '333m短バンク・直線日本最短級・先行ライン圧倒的有利' },
  { code: '34', name: '川崎', region: '南関東', bankLength: 400, straightLength: 58.0, cantAngle: 32.1, waterType: '標準走路', characteristics: '直線長く捲り差し自在・ナイター名物・迫力走路' },
  { code: '35', name: '平塚', region: '南関東', bankLength: 400, straightLength: 54.2, cantAngle: 31.5, waterType: '標準走路', characteristics: '湘南バンク・ナイター盛況・海風あり・力勝負の標準バンク' },
  { code: '36', name: '小田原', region: '南関東', bankLength: 333, straightLength: 36.1, cantAngle: 35.3, waterType: '短走路', characteristics: 'すり鉢状333m急カント・先行逃げ切り率全国屈指・後手は絶望' },
  { code: '37', name: '伊東', region: '南関東', bankLength: 333, straightLength: 46.6, cantAngle: 34.4, waterType: '短走路', characteristics: '温泉地・333mだが直線長め・捲りも十分に届く' },
  { code: '38', name: '静岡', region: '南関東', bankLength: 400, straightLength: 56.4, cantAngle: 30.5, waterType: '標準走路', characteristics: '富士山望む名走路・走りやすく実力通りの決着が多い' },

  // 中部
  { code: '42', name: '名古屋', region: '中部', bankLength: 400, straightLength: 58.8, cantAngle: 34.0, waterType: '標準走路', characteristics: '高速バンク・カントきつく捲り決まる・直線も長い' },
  { code: '43', name: '岐阜', region: '中部', bankLength: 400, straightLength: 59.3, cantAngle: 32.1, waterType: '標準走路', characteristics: '直線長く外伸びる・長良川沿いの風が展開左右' },
  { code: '44', name: '大垣', region: '中部', bankLength: 400, straightLength: 56.0, cantAngle: 32.0, waterType: '標準走路', characteristics: '風の通り道・冬場は伊吹おろし・力のある自力型有利' },
  { code: '45', name: '豊橋', region: '中部', bankLength: 400, straightLength: 60.3, cantAngle: 31.2, waterType: '標準走路', characteristics: '直線長くマクリ追い込み有利・風が強い' },
  { code: '46', name: '富山', region: '中部', bankLength: 333, straightLength: 43.4, cantAngle: 33.4, waterType: '短走路', characteristics: '日本海沿い・333m短バンク・先行ライン主導権で前残り' },
  { code: '47', name: '松阪', region: '中部', bankLength: 400, straightLength: 61.5, cantAngle: 34.2, waterType: '標準走路', characteristics: '直線長くカント急・捲り差しが豪快に決まる' },
  { code: '48', name: '四日市', region: '中部', bankLength: 400, straightLength: 62.4, cantAngle: 32.2, waterType: '標準走路', characteristics: 'ナイターの名所・海風強い・直線極めて長く差し決まる' },

  // 近畿
  { code: '51', name: '福井', region: '近畿', bankLength: 400, straightLength: 52.8, cantAngle: 31.3, waterType: '標準走路', characteristics: 'クセのない走りやすいバンク・先行捲りバランス良好' },
  { code: '53', name: '奈良', region: '近畿', bankLength: 333, straightLength: 38.0, cantAngle: 33.2, waterType: '短走路', characteristics: '秋篠バンク・333m急カント・先行逃げ残り・番手抜け出し' },
  { code: '54', name: '向日町', region: '近畿', bankLength: 400, straightLength: 47.3, cantAngle: 30.3, waterType: '標準走路', characteristics: '直線短め・先行粘り込み有利・京都の伝統バンク' },
  { code: '55', name: '和歌山', region: '近畿', bankLength: 400, straightLength: 59.9, cantAngle: 32.1, waterType: '標準走路', characteristics: 'オレンジバンク・海風あり・直線長めで捲り差し届く' },
  { code: '56', name: '岸和田', region: '近畿', bankLength: 400, straightLength: 56.7, cantAngle: 30.5, waterType: '標準走路', characteristics: '高松宮記念杯名所・海風影響あり・自力選手に人気' },

  // 中国
  { code: '61', name: '玉野', region: '中国', bankLength: 400, straightLength: 47.9, cantAngle: 30.3, waterType: '標準走路', characteristics: '瀬戸内海すぐ横・海風強烈・ホテル一体型スタジアム' },
  { code: '62', name: '広島', region: '中国', bankLength: 400, straightLength: 57.9, cantAngle: 31.4, waterType: '標準走路', characteristics: '都市型走路・直線標準・力通りの展開' },
  { code: '63', name: '防府', region: '中国', bankLength: 333, straightLength: 42.5, cantAngle: 34.4, waterType: '短走路', characteristics: 'すり鉢333mバンク・前残り傾向強く先行ラインが中心' },

  // 四国
  { code: '71', name: '高松', region: '四国', bankLength: 400, straightLength: 54.5, cantAngle: 31.5, waterType: '標準走路', characteristics: '瀬戸内気候・走りやすい標準バンク・番手差し好配当' },
  { code: '72', name: '小松島', region: '四国', bankLength: 400, straightLength: 55.5, cantAngle: 31.4, waterType: '標準走路', characteristics: '海沿い・強風時は波乱・先行捲り互角' },
  { code: '73', name: '高知', region: '四国', bankLength: 500, straightLength: 52.0, cantAngle: 24.3, waterType: '長走路', characteristics: '500mバンク・カント浅く直線短め・先行力も残る独特500' },
  { code: '74', name: '松山', region: '四国', bankLength: 400, straightLength: 58.6, cantAngle: 34.0, waterType: '標準走路', characteristics: 'カントきつく捲りライン強襲・ナイター高速バンク' },

  // 九州
  { code: '81', name: '小倉', region: '九州', bankLength: 400, straightLength: 56.9, cantAngle: 34.1, waterType: 'ドーム', characteristics: 'メディアドーム全天候・風なし無風・スピード決着・捲り飛ぶ' },
  { code: '83', name: '久留米', region: '九州', bankLength: 400, straightLength: 50.7, cantAngle: 31.3, waterType: '標準走路', characteristics: '直線標準・地元九州勢の結束強し・先行粘り込み' },
  { code: '84', name: '武雄', region: '九州', bankLength: 400, straightLength: 64.4, cantAngle: 32.0, waterType: '標準走路', characteristics: '400m最長直線64.4m・先行絶望的・最後の直線で外が強烈に伸びる' },
  { code: '85', name: '佐世保', region: '九州', bankLength: 400, straightLength: 40.2, cantAngle: 31.4, waterType: '標準走路', characteristics: '日本最西端・直線40.2m極短・先行圧倒の前残り名所' },
  { code: '86', name: '別府', region: '九州', bankLength: 400, straightLength: 59.9, cantAngle: 33.4, waterType: '標準走路', characteristics: '海沿い温泉地・風強し・直線長くカント急で外捲り届く' },
  { code: '87', name: '熊本', region: '九州', bankLength: 500, straightLength: 69.5, cantAngle: 25.5, waterType: '長走路', characteristics: '新生熊本バンク(400/500)・直線日本最長級・追い込み天国' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  baseStake: 100, // 1点あたり100円
  maxRaceBudget: 2000, // 1レース上限2,000円
  minOdds: 2.0, // 最低オッズ2.0倍
  maxOdds: 80.0, // 最高オッズ80.0倍
  targetReturn: 3000, // 目標払戻額3,000円
  windSpeedThreshold: 9.0, // 風速見送り 9.0m/s
  waveHeightThreshold: 0,
  dailyProfitTarget: 5000, // 日次利益目標 5,000円
  dailyLossLimit: 5000, // 日次損失上限 5,000円
  allocationMode: 'target', // 目標払戻型配分
  autoScaleBudget: true, // 上限超過時に自動縮小
  defaultBetType: '3t', // デフォルト3連単
  defaultPointCount: 6, // デフォルト6点買い

  // 評価スコア重み (競輪仕様)
  scoreWeight: 30, // 競走得点重み (高得点選手を本命視)
  winRateWeight: 15, // 勝率・2連対率重み
  lineWeight: 30, // ライン連携・位置取り重み
  bankWeight: 15, // バンク特性適合重み (333m先行、500m追込)
  bWeight: 10, // B (バック本数) 先行主導権重み
};

// 競輪公式 1番車〜9番車 カラー規格
export const BOAT_COLORS: Record<number, { bg: string; text: string; name: string; border: string; hex: string }> = {
  1: { bg: 'bg-white', text: 'text-slate-950 font-black', name: '白', border: 'border-slate-300 shadow-sm', hex: '#ffffff' },
  2: { bg: 'bg-slate-950', text: 'text-white font-black', name: '黒', border: 'border-slate-700 shadow-sm', hex: '#020617' },
  3: { bg: 'bg-rose-600', text: 'text-white font-black', name: '赤', border: 'border-rose-700 shadow-sm', hex: '#e11d48' },
  4: { bg: 'bg-blue-600', text: 'text-white font-black', name: '青', border: 'border-blue-700 shadow-sm', hex: '#2563eb' },
  5: { bg: 'bg-amber-400', text: 'text-slate-950 font-black', name: '黄', border: 'border-amber-500 shadow-sm', hex: '#f59e0b' },
  6: { bg: 'bg-emerald-600', text: 'text-white font-black', name: '緑', border: 'border-emerald-700 shadow-sm', hex: '#059669' },
  7: { bg: 'bg-orange-500', text: 'text-white font-black', name: '橙', border: 'border-orange-600 shadow-sm', hex: '#ea580c' },
  8: { bg: 'bg-pink-500', text: 'text-white font-black', name: '桃', border: 'border-pink-600 shadow-sm', hex: '#ec4899' },
  9: { bg: 'bg-purple-600', text: 'text-white font-black', name: '紫', border: 'border-purple-700 shadow-sm', hex: '#9333ea' },
};
