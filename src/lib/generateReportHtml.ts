export function generateReportHtml(options: {
  title: string;
  generatedOn: string;
  incomeLabel: string;
  expenseLabel: string;
  balanceLabel: string;
  savingsLabel: string;
  savingsRateLabel: string;
  dailyAvgLabel: string;
  txCountLabel: string;
  transactionsTitle: string;
  savingsTitle: string;
  dateLabel: string;
  categoryLabel: string;
  descriptionLabel: string;
  amountLabel: string;
  targetNameLabel: string;
  collectedLabel: string;
  targetAmountLabel: string;
  progressLabel: string;
  deadlineLabel: string;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  balanceColor: string;
  totalSavings: string;
  savingsRate: string;
  savingsRateColor: string;
  avgDaily: string;
  txCount: number;
  txRows: string;
  savingsRows: string;
}): string {
  const o = options;
  const styleClose = '<' + '/style>';
  const scriptOpen = '<' + 'script>';
  const scriptClose = '<' + '/script>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${o.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111827; padding: 40px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 22px; font-weight: 700; color: #111827; }
    .header .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
    .kpi-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; margin-bottom: 6px; }
    .kpi-card .value { font-size: 18px; font-weight: 700; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .analytics-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; text-align: center; }
    .analytics-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    .analytics-card .value { font-size: 22px; font-weight: 700; margin-top: 6px; }
    @media print { body { padding: 20px; } }
    @media (max-width: 640px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .analytics-grid { grid-template-columns: 1fr; } }
  ${styleClose}
</head>
<body>
  <div class="header">
    <div>
      <h1>${o.title}</h1>
      <p class="subtitle">${o.generatedOn}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="label">${o.incomeLabel}</div>
      <div class="value" style="color:#059669;">${o.totalIncome}</div>
    </div>
    <div class="kpi-card">
      <div class="label">${o.expenseLabel}</div>
      <div class="value" style="color:#dc2626;">${o.totalExpense}</div>
    </div>
    <div class="kpi-card">
      <div class="label">${o.balanceLabel}</div>
      <div class="value" style="color:${o.balanceColor};">${o.balance}</div>
    </div>
    <div class="kpi-card">
      <div class="label">${o.savingsLabel}</div>
      <div class="value" style="color:#7c3aed;">${o.totalSavings}</div>
    </div>
  </div>

  <div class="analytics-grid">
    <div class="analytics-card">
      <div class="label">${o.savingsRateLabel}</div>
      <div class="value" style="color:${o.savingsRateColor};">${o.savingsRate}</div>
    </div>
    <div class="analytics-card">
      <div class="label">${o.dailyAvgLabel}</div>
      <div class="value">${o.avgDaily}</div>
    </div>
    <div class="analytics-card">
      <div class="label">${o.txCountLabel}</div>
      <div class="value">${o.txCount}</div>
    </div>
  </div>

  ${o.txRows ? `<div class="section">
    <div class="section-title">${o.transactionsTitle}</div>
    <table>
      <thead>
        <tr>
          <th>${o.dateLabel}</th>
          <th>${o.categoryLabel}</th>
          <th>${o.descriptionLabel}</th>
          <th style="text-align:right;">${o.amountLabel}</th>
        </tr>
      </thead>
      <tbody>${o.txRows}</tbody>
    </table>
  </div>` : ''}

  ${o.savingsRows ? `<div class="section">
    <div class="section-title">${o.savingsTitle}</div>
    <table>
      <thead>
        <tr>
          <th>${o.targetNameLabel}</th>
          <th style="text-align:right;">${o.collectedLabel}</th>
          <th style="text-align:right;">${o.targetAmountLabel}</th>
          <th style="text-align:center;">${o.progressLabel}</th>
          <th>${o.deadlineLabel}</th>
        </tr>
      </thead>
      <tbody>${o.savingsRows}</tbody>
    </table>
  </div>` : ''}

  ${scriptOpen}window.onload=function(){window.print();}${scriptClose}
</body>
</html>`;
}
