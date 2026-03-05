import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, TFontDictionary, Content } from 'pdfmake/interfaces';
import { IInvoice } from '../models/Invoice';
import { IUser } from '../types';

// ===========================
// COMPACT DESIGN CONFIGURATION
// ===========================

const BRAND = {
  company: {
    name: 'Cabinet CMT',
    tagline: 'Expert Comptable Agréé',
    phone: '+216 94 338 220',
    email: 'mustapha.temimi@yahoo.fr',
    address: 'N°134 R6, 5000 Monastir, Tunisie',
    taxId: '1420191T/A/P/000'
  },
  
  colors: {
    primary: '#000000',      // Black - main text
    secondary: '#4a4a4a',    // Dark gray - secondary text
    accent: '#000000',       // Black - accents
    success: '#2d2d2d',      // Dark gray - highlights
    muted: '#808080',        // Medium gray - labels
    light: '#f5f5f5',        // Light gray - backgrounds
    white: '#ffffff',         // White
    border: '#d0d0d0'        // Light gray - borders
  }
};

const TAX = {
  vat: 0.19,
  retention: 0.03,
  stamp: 1.000
};

const fonts: TFontDictionary = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);
const mm = (value: number): number => value * 2.83465;

// ===========================
// UTILITY FUNCTIONS
// ===========================

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('fr-FR');
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/\s/g, '.');
};

const numberToFrenchWords = (amount: number): string => {
  const dinars = Math.floor(amount);
  const millimes = Math.round((amount - dinars) * 1000);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const convertHundreds = (num: number): string => {
    if (num === 0) return '';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      if (ten === 7 || ten === 9) {
        const base = ten === 7 ? 60 : 80;
        const remainder = num - base;
        return remainder === 0 ? tens[ten] : `${tens[ten]}-${convertHundreds(remainder)}`;
      }
      if (unit === 0) return tens[ten];
      if (unit === 1 && ten !== 8) return `${tens[ten]}-et-un`;
      return `${tens[ten]}-${units[unit]}`;
    }
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    const result = hundred === 1 ? 'cent' : `${units[hundred]}-cent${hundred > 1 && remainder === 0 ? 's' : ''}`;
    return remainder > 0 ? `${result} ${convertHundreds(remainder)}` : result;
  };

  const convert = (num: number): string => {
    if (num === 0) return 'zéro';
    if (num < 1000) return convertHundreds(num);
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    const result = thousands === 1 ? 'mille' : `${convertHundreds(thousands)}-mille`;
    return remainder > 0 ? `${result} ${convertHundreds(remainder)}` : result;
  };

  let result = dinars > 0 ? `${convert(dinars)} dinar${dinars > 1 ? 's' : ''}` : '';
  if (millimes > 0) {
    if (result) result += ' et ';
    result += `${convert(millimes)} millime${millimes > 1 ? 's' : ''}`;
  }
  if (!result) result = 'zéro dinar';
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// ===========================
// COMPACT COMPONENTS
// ===========================

const createCompactHeader = (): Content[] => {
  return [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: BRAND.company.name.toUpperCase(), fontSize: 14, bold: true, color: BRAND.colors.primary },
            { text: BRAND.company.tagline, fontSize: 8, color: BRAND.colors.secondary, italics: true }
          ]
        },
        {
          width: 'auto',
          stack: [
            { text: BRAND.company.phone, fontSize: 7, color: BRAND.colors.secondary, alignment: 'right' },
            { text: BRAND.company.email, fontSize: 7, color: BRAND.colors.secondary, alignment: 'right' }
          ]
        }
      ],
      margin: [0, 0, 0, mm(2)]
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 555, y2: 0, lineWidth: 1, lineColor: BRAND.colors.primary }],
      margin: [0, 0, 0, mm(4)]
    }
  ];
};

const createCompactDocInfo = (type: 'FACTURE' | 'DEVIS', number: string, date: Date, validUntil?: Date): any => {
  return {
    width: '48%',
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: type, fontSize: 7, color: BRAND.colors.white, bold: true },
          { text: `N° ${number}`, fontSize: 12, color: BRAND.colors.white, bold: true, margin: [0, mm(1), 0, mm(1)] },
          { text: formatDate(date), fontSize: 8, color: BRAND.colors.white },
          validUntil ? { text: `Val. ${formatDate(validUntil)}`, fontSize: 7, color: BRAND.colors.white, italics: true, margin: [0, mm(0.5), 0, 0] } : {}
        ],
        fillColor: BRAND.colors.accent,
        border: [false, false, false, false],
        margin: [mm(4), mm(3), mm(4), mm(3)]
      }]]
    },
    layout: { defaultBorder: false }
  };
};

const createCompactClientInfo = (client: IUser): any => {
  return {
    width: '52%',
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'CLIENT', fontSize: 7, color: BRAND.colors.muted, bold: true },
          { text: client.name, fontSize: 10, color: BRAND.colors.primary, bold: true, margin: [0, mm(0.5), 0, mm(0.5)] },
          { text: client.address || 'N/A', fontSize: 8, color: BRAND.colors.secondary },
          { text: `M.F: ${(client as any).taxId || 'N/A'}`, fontSize: 7, color: BRAND.colors.muted, margin: [0, mm(0.5), 0, 0] }
        ],
        fillColor: BRAND.colors.light,
        border: [true, true, true, true],
        margin: [mm(4), mm(3), mm(4), mm(3)]
      }]]
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => BRAND.colors.primary,
      vLineColor: () => BRAND.colors.primary
    }
  };
};

const createCompactItemsTable = (items: Array<{ description: string; quantity: number; unitPrice: number; total: number; }>, vatRate: number): any => {
  const headerRow = [
    { text: 'Réf', fontSize: 8, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary, alignment: 'center' },
    { text: 'Désignation', fontSize: 8, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary },
    { text: 'Qté', fontSize: 8, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary, alignment: 'center' },
    { text: 'P.U HT', fontSize: 8, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary, alignment: 'right' },
    { text: 'TVA', fontSize: 8, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary, alignment: 'center' },
    { text: 'Total HT', fontSize: 8, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary, alignment: 'right' }
  ];

  const itemRows = items.map((item, i) => {
    const isEven = i % 2 === 0;
    const bgColor = isEven ? BRAND.colors.white : BRAND.colors.light;
    return [
      { text: (i + 1).toString(), fontSize: 8, alignment: 'center', color: BRAND.colors.muted, fillColor: bgColor },
      { text: item.description, fontSize: 8, color: BRAND.colors.primary, fillColor: bgColor },
      { text: item.quantity.toString(), fontSize: 8, alignment: 'center', color: BRAND.colors.secondary, fillColor: bgColor },
      { text: formatCurrency(item.unitPrice), fontSize: 8, alignment: 'right', color: BRAND.colors.secondary, fillColor: bgColor },
      { text: `${(vatRate * 100).toFixed(0)}%`, fontSize: 7, alignment: 'center', color: BRAND.colors.muted, fillColor: bgColor },
      { text: formatCurrency(item.total), fontSize: 8, alignment: 'right', color: BRAND.colors.primary, bold: true, fillColor: bgColor }
    ];
  });

  return {
    table: {
      headerRows: 1,
      widths: ['7%', '42%', '9%', '16%', '9%', '17%'],
      body: [headerRow, ...itemRows]
    },
    layout: {
      hLineWidth: (i: number, node: any) => {
        if (i === 0 || i === 1) return 1.5; // Top borders thicker
        if (i === node.table.body.length) return 1.5; // Bottom border thicker
        return 0.5; // Inner borders thinner
      },
      vLineWidth: (i: number, node: any) => {
        if (i === 0 || i === node.table.widths.length) return 1.5; // Side borders thicker
        return 0.5; // Inner borders thinner
      },
      hLineColor: (i: number, node: any) => {
        if (i === 0 || i === 1) return BRAND.colors.primary; // Header borders black
        if (i === node.table.body.length) return BRAND.colors.primary; // Bottom border black
        return BRAND.colors.border; // Inner borders gray
      },
      vLineColor: (i: number, node: any) => {
        if (i === 0 || i === node.table.widths.length) return BRAND.colors.primary; // Side borders black
        return BRAND.colors.border; // Inner borders gray
      },
      paddingLeft: () => mm(2),
      paddingRight: () => mm(2),
      paddingTop: () => mm(2),
      paddingBottom: () => mm(2)
    },
    margin: [0, mm(4), 0, mm(4)]
  };
};

const createCompactSummary = (type: 'invoice' | 'quote', calc: any): any => {
  const rows: any[] = [
    [
      { text: 'TOTAL HT', fontSize: 8, color: BRAND.colors.secondary, border: [false, false, false, false] },
      { text: formatCurrency(calc.subtotal), fontSize: 8, alignment: 'right', color: BRAND.colors.primary, border: [false, false, false, false] }
    ],
    [
      { text: `TVA ${(calc.vatRate * 100).toFixed(0)}%`, fontSize: 8, color: BRAND.colors.secondary, border: [false, false, false, false] },
      { text: formatCurrency(calc.vat), fontSize: 8, alignment: 'right', color: BRAND.colors.primary, border: [false, false, false, false] }
    ],
    [
      { text: 'Timbre', fontSize: 8, color: BRAND.colors.secondary, border: [false, false, false, true], borderColor: [null, null, null, BRAND.colors.border] },
      { text: formatCurrency(calc.stampDuty), fontSize: 8, alignment: 'right', color: BRAND.colors.primary, border: [false, false, false, true], borderColor: [null, null, null, BRAND.colors.border] }
    ],
    [
      { text: 'TOTAL TTC', fontSize: 9, bold: true, color: BRAND.colors.primary, border: [false, false, false, false], margin: [0, mm(1), 0, mm(1)] },
      { text: `${formatCurrency(calc.totalTTC)} TND`, fontSize: 9, bold: true, alignment: 'right', color: BRAND.colors.primary, border: [false, false, false, false], margin: [0, mm(1), 0, mm(1)] }
    ]
  ];

  if (type === 'invoice') {
    rows.push(
      [
        { text: 'Retenue 3%', fontSize: 8, color: BRAND.colors.secondary, border: [false, true, false, true], borderColor: [null, BRAND.colors.border, null, BRAND.colors.border] },
        { text: `- ${formatCurrency(calc.retention)}`, fontSize: 8, alignment: 'right', color: BRAND.colors.secondary, border: [false, true, false, true], borderColor: [null, BRAND.colors.border, null, BRAND.colors.border] }
      ],
      [
        { text: 'NET À PAYER', fontSize: 10, bold: true, color: BRAND.colors.white, fillColor: BRAND.colors.primary, border: [false, false, false, false], margin: [mm(2), mm(2), mm(2), mm(2)] },
        { text: `${formatCurrency(calc.netToPay)} TND`, fontSize: 10, bold: true, alignment: 'right', color: BRAND.colors.white, fillColor: BRAND.colors.primary, border: [false, false, false, false], margin: [mm(2), mm(2), mm(2), mm(2)] }
      ]
    );
  }

  return {
    width: '40%',
    table: { widths: ['*', 'auto'], body: rows },
    layout: {
      hLineWidth: (i: number, node: any) => {
        if (i === 0) return 0;
        if (i === node.table.body.length - 1) return 1.5; // Thicker line before NET À PAYER
        if (i === node.table.body.length) return 0;
        return 0.5; // Thin lines between rows
      },
      vLineWidth: () => 0,
      hLineColor: (i: number, node: any) => {
        if (i === node.table.body.length - 1) return BRAND.colors.primary; // Black line before NET À PAYER
        return BRAND.colors.border; // Gray lines elsewhere
      },
      paddingLeft: () => mm(3),
      paddingRight: () => mm(3),
      paddingTop: () => mm(2),
      paddingBottom: () => mm(2)
    }
  };
};

const createCompactAmountWords = (amount: number): any => {
  return {
    width: '60%',
    margin: [0, 0, mm(3), 0],
    table: {
      widths: ['*'],
      body: [[{
        text: [
          { text: 'Arrêté à la somme de: ', fontSize: 7, color: BRAND.colors.muted },
          { text: numberToFrenchWords(amount), fontSize: 8, bold: true, color: BRAND.colors.primary }
        ],
        fillColor: BRAND.colors.light,
        border: [true, true, true, true],
        margin: [mm(3), mm(2), mm(3), mm(2)]
      }]]
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => BRAND.colors.primary,
      vLineColor: () => BRAND.colors.primary
    }
  };
};

const createCompactFooter = (): Content[] => {
  return [
    { text: 'Signature & Cachet', fontSize: 8, color: BRAND.colors.muted, alignment: 'right', italics: true, margin: [0, mm(3), 0, mm(3)] },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 555, y2: 0, lineWidth: 0.5, lineColor: BRAND.colors.border }],
      margin: [0, mm(3), 0, mm(2)]
    },
    {
      columns: [
        {
          width: '*',
          text: [
            { text: BRAND.company.name + ' | ', fontSize: 7, bold: true, color: BRAND.colors.primary },
            { text: BRAND.company.address, fontSize: 7, color: BRAND.colors.secondary }
          ]
        },
        {
          width: 'auto',
          text: [
            { text: BRAND.company.phone + ' | ', fontSize: 7, color: BRAND.colors.secondary },
            { text: BRAND.company.email, fontSize: 7, color: BRAND.colors.secondary }
          ],
          alignment: 'right'
        }
      ]
    },
    {
      text: `M.F: ${BRAND.company.taxId}`,
      fontSize: 7,
      color: BRAND.colors.muted,
      alignment: 'center',
      margin: [0, mm(1), 0, 0]
    }
  ];
};

// ===========================
// MAIN GENERATORS
// ===========================

export const generateInvoicePdf = async (invoice: IInvoice, client: IUser): Promise<Buffer> => {
  const vatRate = invoice.taxRate || TAX.vat;
  const calc = {
    subtotal: invoice.subtotal,
    vatRate,
    vat: invoice.subtotal * vatRate,
    stampDuty: TAX.stamp,
    totalTTC: 0,
    retention: invoice.subtotal * TAX.retention,
    netToPay: 0
  };
  calc.totalTTC = calc.subtotal + calc.vat + calc.stampDuty;
  calc.netToPay = calc.totalTTC - calc.retention;

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [mm(12), mm(10), mm(12), mm(10)],
    content: [
      ...createCompactHeader(),
      {
        columns: [createCompactDocInfo('FACTURE', invoice.number, invoice.date), createCompactClientInfo(client)],
        columnGap: mm(3),
        margin: [0, 0, 0, mm(4)]
      },
      createCompactItemsTable(invoice.items, vatRate),
      {
        columns: [createCompactAmountWords(calc.netToPay), createCompactSummary('invoice', calc)],
        columnGap: mm(3),
        margin: [0, 0, 0, mm(3)]
      },
      ...createCompactFooter()
    ],
    defaultStyle: { font: 'Roboto', fontSize: 8, lineHeight: 1.2 }
  };

  return generatePdfBuffer(docDefinition);
};

export const generateQuotePdf = async (quote: {
  number: string;
  date: Date;
  validUntil?: Date;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number; }>;
  subtotal: number;
  taxRate?: number;
  tax: number;
  total: number;
  notes?: string;
}, client: IUser): Promise<Buffer> => {
  const vatRate = quote.taxRate || TAX.vat;
  const calc = {
    subtotal: quote.subtotal,
    vatRate,
    vat: quote.subtotal * vatRate,
    stampDuty: TAX.stamp,
    totalTTC: quote.subtotal + (quote.subtotal * vatRate) + TAX.stamp
  };

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [mm(12), mm(10), mm(12), mm(10)],
    content: [
      ...createCompactHeader(),
      {
        columns: [createCompactDocInfo('DEVIS', quote.number, quote.date, quote.validUntil), createCompactClientInfo(client)],
        columnGap: mm(3),
        margin: [0, 0, 0, mm(4)]
      },
      createCompactItemsTable(quote.items, vatRate),
      {
        columns: [createCompactAmountWords(calc.totalTTC), createCompactSummary('quote', calc)],
        columnGap: mm(3),
        margin: [0, 0, 0, mm(3)]
      },
      quote.notes ? {
        table: {
          widths: ['*'],
          body: [[{
            text: [
              { text: 'Note: ', fontSize: 7, bold: true, color: BRAND.colors.muted },
              { text: quote.notes, fontSize: 8, color: BRAND.colors.secondary }
            ],
            fillColor: BRAND.colors.light,
            border: [true, true, true, true],
            margin: [mm(3), mm(2), mm(3), mm(2)]
          }]]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => BRAND.colors.primary,
          vLineColor: () => BRAND.colors.primary
        },
        margin: [0, 0, 0, mm(3)]
      } : {},
      ...createCompactFooter()
    ],
    defaultStyle: { font: 'Roboto', fontSize: 8, lineHeight: 1.2 }
  };

  return generatePdfBuffer(docDefinition);
};

const generatePdfBuffer = (docDefinition: TDocumentDefinitions): Promise<Buffer> => {
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    try {
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export { formatDate, formatCurrency, numberToFrenchWords, BRAND, TAX };