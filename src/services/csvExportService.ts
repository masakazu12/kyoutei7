import { RaceHistoryRecord } from '../types/kyotei';

/**
 * 10.3 CSV出力サービス
 * UTF-8 BOM付きで出力し、Excelで開いた際に文字化けしない形式
 * ファイル名例：KyoteiHistory_20261006.csv
 */

export function exportHistoryToCsv(history: RaceHistoryRecord[], baseDateStr?: string): void {
  if (!history || history.length === 0) {
    alert('出力対象の履歴データがありません。');
    return;
  }

  // ヘッダー行定義
  const headers = [
    '登録日時',
    '日付',
    '開催場',
    'レース番号',
    'レース名',
    '判定状態',
    '舟券種別',
    '購入点数',
    '総投資額(円)',
    '確定着順',
    '確定払戻金(円)',
    '総払戻額(円)',
    '純利益(円)',
    '的中判定',
    '購入買い目詳細',
    '見送り/停止理由',
  ];

  const escapeCsv = (str: string | number | undefined) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows: string[] = [];
  rows.push(headers.join(','));

  const betTypeNames: Record<string, string> = {
    '3t': '3連単',
    '3f': '3連複',
    '2t': '2連単',
    '2f': '2連複',
    '1t': '単勝',
    '1f': '複勝',
    'wide': '拡連複',
  };

  history.forEach(item => {
    const betsDetail = item.bets
      .map(b => `${b.combination}(${b.odds}倍:${b.stake}円${b.isHit ? ':的中' : ''})`)
      .join(' / ');

    const betTypeName = item.betType ? (betTypeNames[item.betType] || item.betType) : '3連単';

    const row = [
      escapeCsv(item.timestamp),
      escapeCsv(item.date),
      escapeCsv(item.venue),
      escapeCsv(`${item.raceNo}R`),
      escapeCsv(item.raceTitle),
      escapeCsv(item.status),
      escapeCsv(betTypeName),
      escapeCsv(item.pointCount || item.bets.length || 0),
      escapeCsv(item.totalStake),
      escapeCsv(item.finishOrder || '-'),
      escapeCsv(item.officialPayout || 0),
      escapeCsv(item.totalReturn),
      escapeCsv(item.profit),
      escapeCsv(item.isHit ? '的中' : item.totalStake > 0 ? 'ハズレ' : '-'),
      escapeCsv(betsDetail),
      escapeCsv(item.skipReason || item.stopReason || '-'),
    ];

    rows.push(row.join(','));
  });

  // UTF-8 BOM (\uFEFF) を付与
  const bom = '\uFEFF';
  const csvContent = bom + rows.join('\r\n');

  // Blob作成とダウンロードトリガー
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const now = new Date();
  const dateFormatted = baseDateStr
    ? baseDateStr.replace(/-/g, '')
    : `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', `KyoteiHistory_${dateFormatted}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
