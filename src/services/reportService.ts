import { Candidate } from '../types/candidate';

export function generateGeneralReportHTML(candidates: Candidate[], analystEmail: string): string {
  const totalCandidates = candidates.length;
  const classified = candidates.filter(c => c.statusTriagem === 'Classificado').length;
  const disqualified = candidates.filter(c => c.statusTriagem === 'Desclassificado').length;
  const review = candidates.filter(c => c.statusTriagem === 'Revisar').length;
  const pending = candidates.filter(c => !c.statusTriagem || c.statusTriagem === '').length;

  const byArea = {
    Administrativa: candidates.filter(c => c.area === 'Administrativa').length,
    Assistencial: candidates.filter(c => c.area === 'Assistencial').length
  };

  const classifiedByArea = {
    Administrativa: candidates.filter(c => c.area === 'Administrativa' && c.statusTriagem === 'Classificado').length,
    Assistencial: candidates.filter(c => c.area === 'Assistencial' && c.statusTriagem === 'Classificado').length
  };

  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório Geral de Triagem</title>
  <style>
    @media print {
      @page { margin: 1.5cm; }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #1e40af;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #2563eb;
      padding-left: 10px;
    }
    .header {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-box {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #1e293b;
    }
    .stat-percent {
      font-size: 14px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #1e293b;
    }
    tr:hover {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
  </style>
</head>
<body>
  <h1>📊 Relatório Geral de Triagem de Candidatos</h1>

  <div class="header">
    <p><strong>Data:</strong> ${date} às ${time}</p>
    <p><strong>Analista:</strong> ${analystEmail}</p>
  </div>

  <h2>Resumo Geral</h2>
  <div class="stats">
    <div class="stat-box">
      <div class="stat-label">Total de Candidatos</div>
      <div class="stat-value">${totalCandidates}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Classificados</div>
      <div class="stat-value">${classified}</div>
      <div class="stat-percent">${((classified / totalCandidates) * 100).toFixed(1)}%</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Desclassificados</div>
      <div class="stat-value">${disqualified}</div>
      <div class="stat-percent">${((disqualified / totalCandidates) * 100).toFixed(1)}%</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Para Revisar</div>
      <div class="stat-value">${review}</div>
      <div class="stat-percent">${((review / totalCandidates) * 100).toFixed(1)}%</div>
    </div>
  </div>

  <h2>Por Área</h2>
  <table>
    <tr>
      <th>Área</th>
      <th>Total</th>
      <th>Classificados</th>
      <th>Taxa</th>
    </tr>
    <tr>
      <td>Administrativa</td>
      <td>${byArea.Administrativa}</td>
      <td>${classifiedByArea.Administrativa}</td>
      <td>${byArea.Administrativa > 0 ? ((classifiedByArea.Administrativa / byArea.Administrativa) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr>
      <td>Assistencial</td>
      <td>${byArea.Assistencial}</td>
      <td>${classifiedByArea.Assistencial}</td>
      <td>${byArea.Assistencial > 0 ? ((classifiedByArea.Assistencial / byArea.Assistencial) * 100).toFixed(1) : 0}%</td>
    </tr>
  </table>

  <h2>Candidatos Classificados (${classified})</h2>
  <table>
    <tr>
      <th>Nome</th>
      <th>Área</th>
      <th>Cargo</th>
      <th>Nº Registro</th>
    </tr>
    ${candidates
      .filter(c => c.statusTriagem === 'Classificado')
      .map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.area}</td>
      <td>${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial}</td>
      <td>${c.registrationNumber}</td>
    </tr>
      `)
      .join('')}
  </table>

  <h2>Candidatos Desclassificados (${disqualified})</h2>
  <table>
    <tr>
      <th>Nome</th>
      <th>Área</th>
      <th>Cargo</th>
      <th>Nº Registro</th>
    </tr>
    ${candidates
      .filter(c => c.statusTriagem === 'Desclassificado')
      .map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.area}</td>
      <td>${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial}</td>
      <td>${c.registrationNumber}</td>
    </tr>
      `)
      .join('')}
  </table>

  <h2>Candidatos para Revisar (${review})</h2>
  <table>
    <tr>
      <th>Nome</th>
      <th>Área</th>
      <th>Cargo</th>
      <th>Nº Registro</th>
    </tr>
    ${candidates
      .filter(c => c.statusTriagem === 'Revisar')
      .map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.area}</td>
      <td>${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial}</td>
      <td>${c.registrationNumber}</td>
    </tr>
      `)
      .join('')}
  </table>
</body>
</html>
  `;
}

export function generateClassifiedReportHTML(candidates: Candidate[], analystEmail: string): string {
  const classified = candidates.filter(c => c.statusTriagem === 'Classificado');
  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório de Candidatos Classificados</title>
  <style>
    @media print {
      @page { margin: 1.5cm; }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #16a34a;
      border-bottom: 3px solid #16a34a;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header {
      background: #f0fdf4;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
      border-left: 4px solid #16a34a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f0fdf4;
      font-weight: 600;
      color: #166534;
    }
    tr:hover {
      background: #f8fafc;
    }
    .count {
      font-size: 24px;
      font-weight: bold;
      color: #16a34a;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>✅ Candidatos Classificados</h1>

  <div class="header">
    <p><strong>Data:</strong> ${date} às ${time}</p>
    <p><strong>Analista:</strong> ${analystEmail}</p>
  </div>

  <p class="count">Total: ${classified.length} candidatos classificados</p>

  <table>
    <tr>
      <th>Nº</th>
      <th>Nome</th>
      <th>Área</th>
      <th>Cargo</th>
      <th>Telefone</th>
      <th>Nº Registro</th>
    </tr>
    ${classified
      .map((c, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${c.name}</td>
      <td>${c.area}</td>
      <td>${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.registrationNumber}</td>
    </tr>
      `)
      .join('')}
  </table>
</body>
</html>
  `;
}

export function generateDisqualifiedReportHTML(candidates: Candidate[], analystEmail: string): string {
  const disqualified = candidates.filter(c => c.statusTriagem === 'Desclassificado');
  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório de Candidatos Desclassificados</title>
  <style>
    @media print {
      @page { margin: 1.5cm; }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #dc2626;
      border-bottom: 3px solid #dc2626;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header {
      background: #fef2f2;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
      border-left: 4px solid #dc2626;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #fef2f2;
      font-weight: 600;
      color: #991b1b;
    }
    tr:hover {
      background: #f8fafc;
    }
    .count {
      font-size: 24px;
      font-weight: bold;
      color: #dc2626;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>❌ Candidatos Desclassificados</h1>

  <div class="header">
    <p><strong>Data:</strong> ${date} às ${time}</p>
    <p><strong>Analista:</strong> ${analystEmail}</p>
  </div>

  <p class="count">Total: ${disqualified.length} candidatos desclassificados</p>

  <table>
    <tr>
      <th>Nº</th>
      <th>Nome</th>
      <th>Área</th>
      <th>Cargo</th>
      <th>Telefone</th>
      <th>Nº Registro</th>
    </tr>
    ${disqualified
      .map((c, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${c.name}</td>
      <td>${c.area}</td>
      <td>${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.registrationNumber}</td>
    </tr>
      `)
      .join('')}
  </table>
</body>
</html>
  `;
}

export function openReportInNewWindow(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
