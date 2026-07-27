import type { AustralianFinancialYear } from '../types/tax';

export const INITIAL_FINANCIAL_YEARS: AustralianFinancialYear[] = [
  {
    id: '2025-26',
    label: '2025–26',
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    grossIncome: 96420,
    taxableIncome: 89670,
    taxWithheld: 24167,
    totalDeductions: 6750,
    medicareLevy: 1793,
    helpRepayment: 3401,
    assessmentResult: 1284, // +$1,284 refund
    employerSuper: 11246,
    employerCount: 2,
    effectiveTaxRate: 23.7,

    income: [
      {
        id: 'inc-2026-1',
        category: 'salary_wages',
        description: 'Senior Software Engineer Salary',
        employerOrPayer: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.98,
          sourceDocumentId: 'doc-inc-stmt-2026',
          sourceDocumentName: 'ATO-Income-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Payer: Atlassian Pty Ltd | Gross Salary: $86,420.00 | Tax Withheld: $19,540.00',
          manuallyConfirmed: true
        },
        grossAmount: {
          value: 86420,
          confidence: 0.98,
          sourceDocumentId: 'doc-inc-stmt-2026',
          sourceDocumentName: 'ATO-Income-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Gross salary & wages: $86,420',
          manuallyConfirmed: true
        },
        taxWithheld: {
          value: 21867,
          confidence: 0.98,
          sourceDocumentId: 'doc-inc-stmt-2026',
          sourceDocumentName: 'ATO-Income-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Tax withheld: $21,867',
          manuallyConfirmed: true
        }
      },
      {
        id: 'inc-2026-2',
        category: 'allowances',
        description: 'Tech & On-call Allowance',
        employerOrPayer: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.95,
          sourceDocumentId: 'doc-inc-stmt-2026',
          sourceDocumentName: 'ATO-Income-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Allowances paid: $5,000.00',
          manuallyConfirmed: true
        },
        grossAmount: {
          value: 5000,
          confidence: 0.95,
          sourceDocumentId: 'doc-inc-stmt-2026',
          sourceDocumentName: 'ATO-Income-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Allowances: $5,000',
          manuallyConfirmed: true
        },
        taxWithheld: {
          value: 1600,
          confidence: 0.95,
          sourceDocumentId: 'doc-inc-stmt-2026',
          sourceDocumentName: 'ATO-Income-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Tax withheld on allowances: $1,600',
          manuallyConfirmed: true
        }
      },
      {
        id: 'inc-2026-3',
        category: 'dividends_franking',
        description: 'BHP Group Dividends & Franking Credits',
        employerOrPayer: {
          value: 'BHP Group Limited',
          confidence: 0.94,
          sourceDocumentId: 'doc-div-2026',
          sourceDocumentName: 'BHP-Dividend-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Unfranked: $0 | Franked: $3,500 | Franking Credit: $1,500',
          manuallyConfirmed: true
        },
        grossAmount: {
          value: 5000,
          confidence: 0.94,
          sourceDocumentId: 'doc-div-2026',
          sourceDocumentName: 'BHP-Dividend-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Total Gross Dividend: $5,000',
          manuallyConfirmed: true
        },
        taxWithheld: {
          value: 700,
          confidence: 0.94,
          sourceDocumentId: 'doc-div-2026',
          sourceDocumentName: 'BHP-Dividend-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Franking credit tax offset: $700',
          manuallyConfirmed: true
        },
        frankingCredits: {
          value: 1500,
          confidence: 0.94,
          sourceDocumentId: 'doc-div-2026',
          sourceDocumentName: 'BHP-Dividend-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Franking credits: $1,500',
          manuallyConfirmed: true
        }
      }
    ],

    deductions: [
      {
        id: 'ded-2026-1',
        category: 'working_from_home',
        description: 'WFH Fixed Rate Method (67c/hr - 1,200 hours)',
        amount: {
          value: 804,
          confidence: 0.97,
          sourceDocumentId: 'doc-tax-return-2026',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2025-26.pdf',
          sourcePage: 3,
          sourceText: 'Item D5 WFH deduction: $804',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-wfh-log',
        receiptFileName: 'WFH-Timesheet-Log-2025-26.pdf'
      },
      {
        id: 'ded-2026-2',
        category: 'tools_equipment',
        description: 'Apple MacBook Pro M3 Max (Work allocation 80%)',
        amount: {
          value: 2800,
          confidence: 0.96,
          sourceDocumentId: 'doc-tax-return-2026',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2025-26.pdf',
          sourcePage: 3,
          sourceText: 'Item D5 Tools & Laptop equipment: $2,800',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-macbook',
        receiptFileName: 'Apple-Store-Receipt-MacBook.pdf'
      },
      {
        id: 'ded-2026-3',
        category: 'self_education',
        description: 'AWS Certified Solutions Architect & Cloud Conference',
        amount: {
          value: 1950,
          confidence: 0.95,
          sourceDocumentId: 'doc-tax-return-2026',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2025-26.pdf',
          sourcePage: 4,
          sourceText: 'Item D4 Self-education course fees: $1,950',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-aws',
        receiptFileName: 'AWS-Training-Invoice.pdf'
      },
      {
        id: 'ded-2026-4',
        category: 'phone_internet',
        description: 'Home Fibre Internet & Mobile (Work percentage 60%)',
        amount: {
          value: 720,
          confidence: 0.93,
          sourceDocumentId: 'doc-tax-return-2026',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2025-26.pdf',
          sourcePage: 3,
          sourceText: 'Item D5 Phone & Internet: $720',
          manuallyConfirmed: false
        },
        hasReceipt: false,
        notes: 'Telstra monthly bills missing receipt proof for Q3/Q4.'
      },
      {
        id: 'ded-2026-5',
        category: 'tax_agent_fees',
        description: 'Previous Year Tax Agent Preparation Fee',
        amount: {
          value: 476,
          confidence: 0.99,
          sourceDocumentId: 'doc-tax-return-2026',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2025-26.pdf',
          sourcePage: 4,
          sourceText: 'Item D10 Cost of managing tax affairs: $476',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-taxagent',
        receiptFileName: 'H&R-Block-Receipt-2025.pdf'
      }
    ],

    superContributions: [
      {
        id: 'super-2026-q1',
        employerName: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Employer: Atlassian Pty Ltd | Pay Date: 28/10/2025',
          manuallyConfirmed: true
        },
        fundName: {
          value: 'AustralianSuper',
          confidence: 0.99,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Fund: AustralianSuper (USI STA0100AU)',
          manuallyConfirmed: true
        },
        periodStart: '2025-07-01',
        periodEnd: '2025-09-30',
        payDate: {
          value: '2025-10-25',
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Date received: 25/10/2025',
          manuallyConfirmed: true
        },
        qualifyingEarnings: {
          value: 22855,
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Qualifying earnings Q1: $22,855',
          manuallyConfirmed: true
        },
        sgPercentage: 12.0,
        expectedAmount: 2742.6,
        recordedAmount: {
          value: 2742.6,
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Contribution amount: $2,742.60',
          manuallyConfirmed: true
        },
        type: 'employer_sg',
        isPaid: true
      },
      {
        id: 'super-2026-q2',
        employerName: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Employer: Atlassian Pty Ltd | Pay Date: 24/01/2026',
          manuallyConfirmed: true
        },
        fundName: {
          value: 'AustralianSuper',
          confidence: 0.99,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Fund: AustralianSuper',
          manuallyConfirmed: true
        },
        periodStart: '2025-10-01',
        periodEnd: '2025-12-31',
        payDate: {
          value: '2026-01-24',
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Date received: 24/01/2026',
          manuallyConfirmed: true
        },
        qualifyingEarnings: {
          value: 23500,
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Qualifying earnings Q2: $23,500',
          manuallyConfirmed: true
        },
        sgPercentage: 12.0,
        expectedAmount: 2820.0,
        recordedAmount: {
          value: 2820.0,
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Contribution amount: $2,820.00',
          manuallyConfirmed: true
        },
        type: 'employer_sg',
        isPaid: true
      },
      {
        id: 'super-2026-q3',
        employerName: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Employer: Atlassian Pty Ltd | Pay Date: 26/04/2026',
          manuallyConfirmed: true
        },
        fundName: {
          value: 'AustralianSuper',
          confidence: 0.99,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Fund: AustralianSuper',
          manuallyConfirmed: true
        },
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        payDate: {
          value: '2026-04-26',
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Date received: 26/04/2026',
          manuallyConfirmed: true
        },
        qualifyingEarnings: {
          value: 24200,
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Qualifying earnings Q3: $24,200',
          manuallyConfirmed: true
        },
        sgPercentage: 12.0,
        expectedAmount: 2904.0,
        recordedAmount: {
          value: 2500.0, // Intentional variance for super audit alert!
          confidence: 0.95,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Contribution amount: $2,500.00 (Shortfall: $404.00)',
          manuallyConfirmed: false
        },
        type: 'employer_sg',
        isPaid: true
      },
      {
        id: 'super-2026-q4',
        employerName: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Employer: Atlassian Pty Ltd | Pay Date: 25/07/2026',
          manuallyConfirmed: true
        },
        fundName: {
          value: 'AustralianSuper',
          confidence: 0.99,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Fund: AustralianSuper',
          manuallyConfirmed: true
        },
        periodStart: '2026-04-01',
        periodEnd: '2026-06-30',
        payDate: {
          value: '2026-07-25',
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Date received: 25/07/2026',
          manuallyConfirmed: true
        },
        qualifyingEarnings: {
          value: 25865,
          confidence: 0.96,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Qualifying earnings Q4: $25,865',
          manuallyConfirmed: true
        },
        sgPercentage: 12.0,
        expectedAmount: 3103.8,
        recordedAmount: {
          value: 3183.4,
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2026',
          sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
          sourcePage: 1,
          sourceText: 'Contribution amount: $3,183.40',
          manuallyConfirmed: true
        },
        type: 'employer_sg',
        isPaid: true
      }
    ],

    payslips: [
      {
        id: 'ps-2026-01',
        employerName: {
          value: 'Atlassian Pty Ltd',
          confidence: 0.99,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Atlassian Pty Ltd ABN 53 102 441 916',
          manuallyConfirmed: true
        },
        abn: {
          value: '53 102 441 916',
          confidence: 0.99,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'ABN 53 102 441 916',
          manuallyConfirmed: true
        },
        payPeriodStart: '2026-06-01',
        payPeriodEnd: '2026-06-15',
        paymentDate: {
          value: '2026-06-15',
          confidence: 0.99,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Pay Date: 15/06/2026',
          manuallyConfirmed: true
        },
        grossPay: {
          value: 3708.46,
          confidence: 0.98,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Gross Earnings: $3,708.46',
          manuallyConfirmed: true
        },
        taxWithheld: {
          value: 840.0,
          confidence: 0.98,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'PAYG Tax Withheld: $840.00',
          manuallyConfirmed: true
        },
        netPay: {
          value: 2710.46,
          confidence: 0.98,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Net Pay: $2,710.46',
          manuallyConfirmed: true
        },
        hourlyRate: {
          value: 57.5,
          confidence: 0.96,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Hourly Rate: $57.50 / hr',
          manuallyConfirmed: true
        },
        ordinaryHours: {
          value: 64.5,
          confidence: 0.96,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Ordinary Hours: 64.5',
          manuallyConfirmed: true
        },
        employerSuper: {
          value: 445.02,
          confidence: 0.97,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Superannuation (12%): $445.02',
          manuallyConfirmed: true
        },
        helpWithheld: {
          value: 158.0,
          confidence: 0.95,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'STSL / HELP Withheld: $158.00',
          manuallyConfirmed: true
        },
        leaveBalanceAccruedHours: {
          value: 124.5,
          confidence: 0.93,
          sourceDocumentId: 'doc-payslip-jun2026',
          sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf',
          sourcePage: 1,
          sourceText: 'Annual Leave Balance: 124.50 hrs',
          manuallyConfirmed: true
        },
        sourceDocumentId: 'doc-payslip-jun2026',
        sourceDocumentName: 'Atlassian-Payslip-2026-06-15.pdf'
      }
    ],

    studyLoans: {
      openingBalance: {
        value: 28660.8,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Opening Balance (1 July 2025): $28,400.00',
        manuallyConfirmed: true
      },
      indexationRate: 0.028, // 4.7% CPI indexation
      indexationAmount: {
        value: 802.5,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Indexation applied (1 June 2026 @ 4.7%): $1,334.80',
        manuallyConfirmed: true
      },
      compulsoryRepayment: {
        value: 3401,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Compulsory Repayment (Assessment 2026): $3,401.00',
        manuallyConfirmed: true
      },
      voluntaryRepayments: {
        value: 1000,
        confidence: 0.98,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Voluntary Repayments: $1,000.00',
        manuallyConfirmed: true
      },
      creditsAdjustments: {
        value: 0,
        confidence: 1.0,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Credits / Adjustments: $0.00',
        manuallyConfirmed: true
      },
      closingBalance: {
        value: 25062.3,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Closing Balance (30 June 2026): $24,614.80',
        manuallyConfirmed: true
      },
      amountWithheldPayroll: {
        value: 3401,
        confidence: 0.97,
        sourceDocumentId: 'doc-help-stmt-2026',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Total HELP withheld by employer: $4,108.00',
        manuallyConfirmed: true
      },
      estimatedPayoffYears: 5.2
    },

    documents: [
      {
        id: 'doc-tax-return-2026',
        fileName: 'ATO-Individual-Tax-Return-2025-26.pdf',
        fileSize: 428000,
        fileType: 'tax_return',
        uploadDate: '2026-07-14',
        financialYear: '2025–26',
        pageCount: 5,
        parsedBy: 'rule_based',
        confidenceAverage: 0.97
      },
      {
        id: 'doc-noa-2026',
        fileName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        fileSize: 215000,
        fileType: 'notice_of_assessment',
        uploadDate: '2026-07-22',
        financialYear: '2025–26',
        pageCount: 2,
        parsedBy: 'rule_based',
        confidenceAverage: 0.99
      },
      {
        id: 'doc-inc-stmt-2026',
        fileName: 'ATO-Income-Statement-2025-26.pdf',
        fileSize: 180000,
        fileType: 'income_statement',
        uploadDate: '2026-07-05',
        financialYear: '2025–26',
        pageCount: 1,
        parsedBy: 'rule_based',
        confidenceAverage: 0.98
      },
      {
        id: 'doc-super-2026',
        fileName: 'AustralianSuper-Statement-2025-26.pdf',
        fileSize: 310000,
        fileType: 'super_statement',
        uploadDate: '2026-07-10',
        financialYear: '2025–26',
        pageCount: 3,
        parsedBy: 'rule_based',
        confidenceAverage: 0.96
      }
    ],

    assessment: {
      taxableIncome: {
        value: 89670,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Taxable income: $89,670',
        manuallyConfirmed: true
      },
      grossTaxOnTaxableIncome: {
        value: 17689,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Tax on taxable income: $17,689',
        manuallyConfirmed: true
      },
      nonRefundableTaxOffsets: {
        value: 0,
        confidence: 1.0,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Tax offsets: $0',
        manuallyConfirmed: true
      },
      medicareLevy: {
        value: 1793,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Medicare levy: $1,793',
        manuallyConfirmed: true
      },
      helpCompulsoryRepayment: {
        value: 3401,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'HELP compulsory repayment: $3,401',
        manuallyConfirmed: true
      },
      totalTaxAndLevies: {
        value: 22883,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Total tax & levies assessed: $23,602',
        manuallyConfirmed: true
      },
      taxWithheldCredit: {
        value: 24167,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Tax credits & PAYG withheld: $24,167',
        manuallyConfirmed: true
      },
      assessmentResult: {
        value: 1284,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Outcome: $1,284 credit refund',
        manuallyConfirmed: true
      },
      isRefund: true,
      issueDate: {
        value: '2026-07-22',
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Date of issue: 22 July 2026',
        manuallyConfirmed: true
      },
      noticeReference: {
        value: 'NOA-98234-2026',
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        sourceText: 'Our reference: 98234-2026-NOA',
        manuallyConfirmed: true
      },
      lodgedReturnDiffs: [
        'Deduction item D5 (Phone & Internet) adjusted by ATO from $820 to $720 due to evidence verification policy.'
      ]
    },

    alerts: [
      {
        id: 'alt-2026-1',
        type: 'super_below_expected',
        title: 'Super Contribution Below 12% Guarantee',
        description: 'Atlassian Pty Ltd contributed $2,500.00 in Q3, which is $404.00 below the expected 12% SG ($2,904.00).',
        severity: 'warning',
        financialYear: '2025–26',
        sourceDocumentId: 'doc-super-2026',
        sourceDocumentName: 'AustralianSuper-Statement-2025-26.pdf',
        sourcePage: 1,
        extractedField: 'recordedAmount'
      },
      {
        id: 'alt-2026-2',
        type: 'deduction_adjusted',
        title: 'ATO Adjusted Phone & Internet Deduction',
        description: 'Notice of Assessment shows ATO reduced claimed phone/internet deduction from $820 to $720 ($100 difference).',
        severity: 'warning',
        financialYear: '2025–26',
        sourceDocumentId: 'doc-noa-2026',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2025-26.pdf',
        sourcePage: 1,
        extractedField: 'lodgedReturnDiffs'
      }
    ]
  },
  {
    id: '2024-25',
    label: '2024–25',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    grossIncome: 82300,
    taxableIncome: 77480,
    taxWithheld: 20384,
    totalDeductions: 4820,
    medicareLevy: 1550,
    helpRepayment: 2712,
    assessmentResult: 2090, // +$2,090 refund
    employerSuper: 9240,
    employerCount: 1,
    effectiveTaxRate: 22.2,

    income: [
      {
        id: 'inc-2025-1',
        category: 'salary_wages',
        description: 'Software Engineer Salary',
        employerOrPayer: {
          value: 'Canva Pty Ltd',
          confidence: 0.99,
          sourceDocumentId: 'doc-inc-stmt-2025',
          sourceDocumentName: 'ATO-Income-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Payer: Canva Pty Ltd | Gross Salary: $82,300.00',
          manuallyConfirmed: true
        },
        grossAmount: {
          value: 82300,
          confidence: 0.99,
          sourceDocumentId: 'doc-inc-stmt-2025',
          sourceDocumentName: 'ATO-Income-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Gross salary & wages: $82,300',
          manuallyConfirmed: true
        },
        taxWithheld: {
          value: 20384,
          confidence: 0.99,
          sourceDocumentId: 'doc-inc-stmt-2025',
          sourceDocumentName: 'ATO-Income-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Tax withheld: $20,384',
          manuallyConfirmed: true
        }
      }
    ],

    deductions: [
      {
        id: 'ded-2025-1',
        category: 'working_from_home',
        description: 'WFH Fixed Rate (67c/hr - 1,100 hours)',
        amount: {
          value: 737,
          confidence: 0.98,
          sourceDocumentId: 'doc-tax-return-2025',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2024-25.pdf',
          sourcePage: 3,
          sourceText: 'Item D5 WFH deduction: $737',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-wfh-2025',
        receiptFileName: 'WFH-Logbook-2024-25.pdf'
      },
      {
        id: 'ded-2025-2',
        category: 'tools_equipment',
        description: 'Dell UltraSharp 32" 4K Monitor',
        amount: {
          value: 1250,
          confidence: 0.96,
          sourceDocumentId: 'doc-tax-return-2025',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2024-25.pdf',
          sourcePage: 3,
          sourceText: 'Item D5 Monitor Equipment: $1,250',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-dell',
        receiptFileName: 'Dell-Invoice-Monitor.pdf'
      },
      {
        id: 'ded-2025-3',
        category: 'professional_memberships',
        description: 'Australian Computer Society (ACS) Senior Membership',
        amount: {
          value: 580,
          confidence: 0.98,
          sourceDocumentId: 'doc-tax-return-2025',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2024-25.pdf',
          sourcePage: 4,
          sourceText: 'Item D5 Professional Subscriptions: $580',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-acs',
        receiptFileName: 'ACS-Membership-Receipt.pdf'
      },
      {
        id: 'ded-2025-4',
        category: 'donations',
        description: 'Red Cross Australia Flood Appeal',
        amount: {
          value: 500,
          confidence: 0.99,
          sourceDocumentId: 'doc-tax-return-2025',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2024-25.pdf',
          sourcePage: 4,
          sourceText: 'Item D9 Gift & Donations: $500',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-redcross',
        receiptFileName: 'Red-Cross-Tax-Receipt.pdf'
      },
      {
        id: 'ded-2025-5',
        category: 'tax_agent_fees',
        description: 'Tax Agent Preparation Fee',
        amount: {
          value: 420,
          confidence: 0.99,
          sourceDocumentId: 'doc-tax-return-2025',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2024-25.pdf',
          sourcePage: 4,
          sourceText: 'Item D10 Tax agent fee: $420',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-tax-2025',
        receiptFileName: 'Tax-Agent-Invoice-2024.pdf'
      },
      {
        id: 'ded-2025-6',
        category: 'phone_internet',
        description: 'Mobile Phone Work Usage',
        amount: {
          value: 1333,
          confidence: 0.95,
          sourceDocumentId: 'doc-tax-return-2025',
          sourceDocumentName: 'ATO-Individual-Tax-Return-2024-25.pdf',
          sourcePage: 3,
          sourceText: 'Item D5 Mobile phone: $1,333',
          manuallyConfirmed: true
        },
        hasReceipt: true,
        receiptDocumentId: 'doc-rec-optus',
        receiptFileName: 'Optus-Annual-Tax-Summary.pdf'
      }
    ],

    superContributions: [
      {
        id: 'super-2025-full',
        employerName: {
          value: 'Canva Pty Ltd',
          confidence: 0.99,
          sourceDocumentId: 'doc-super-2025',
          sourceDocumentName: 'AustralianSuper-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Employer: Canva Pty Ltd',
          manuallyConfirmed: true
        },
        fundName: {
          value: 'AustralianSuper',
          confidence: 0.99,
          sourceDocumentId: 'doc-super-2025',
          sourceDocumentName: 'AustralianSuper-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Fund: AustralianSuper',
          manuallyConfirmed: true
        },
        periodStart: '2024-07-01',
        periodEnd: '2025-06-30',
        payDate: {
          value: '2025-07-15',
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2025',
          sourceDocumentName: 'AustralianSuper-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Total employer contributions: $9,240.00',
          manuallyConfirmed: true
        },
        qualifyingEarnings: {
          value: 82300,
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2025',
          sourceDocumentName: 'AustralianSuper-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Qualifying earnings: $82,300',
          manuallyConfirmed: true
        },
        sgPercentage: 11.5, // 11.5% SG for FY2024-25
        expectedAmount: 9464.5,
        recordedAmount: {
          value: 9240,
          confidence: 0.98,
          sourceDocumentId: 'doc-super-2025',
          sourceDocumentName: 'AustralianSuper-Statement-2024-25.pdf',
          sourcePage: 1,
          sourceText: 'Total recorded: $9,240',
          manuallyConfirmed: true
        },
        type: 'employer_sg',
        isPaid: true
      }
    ],

    payslips: [],

    studyLoans: {
      openingBalance: {
        value: 30400,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Opening Balance: $30,400.00',
        manuallyConfirmed: true
      },
      indexationRate: 0.032,
      indexationAmount: {
        value: 972.8,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Indexation: $840.00',
        manuallyConfirmed: true
      },
      compulsoryRepayment: {
        value: 2712,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Compulsory Repayment: $2,712.00',
        manuallyConfirmed: true
      },
      voluntaryRepayments: {
        value: 0,
        confidence: 1.0,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Voluntary Repayments: $0.00',
        manuallyConfirmed: true
      },
      creditsAdjustments: {
        value: 0,
        confidence: 1.0,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Adjustments: $0.00',
        manuallyConfirmed: true
      },
      closingBalance: {
        value: 28660.8,
        confidence: 0.99,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Closing Balance: $28,400.00',
        manuallyConfirmed: true
      },
      amountWithheldPayroll: {
        value: 2712,
        confidence: 0.98,
        sourceDocumentId: 'doc-help-stmt-2025',
        sourceDocumentName: 'ATO-Study-Loan-Statement-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Withheld by employer: $2,712.00',
        manuallyConfirmed: true
      },
      estimatedPayoffYears: 7.0
    },

    documents: [
      {
        id: 'doc-tax-return-2025',
        fileName: 'ATO-Individual-Tax-Return-2024-25.pdf',
        fileSize: 410000,
        fileType: 'tax_return',
        uploadDate: '2025-07-18',
        financialYear: '2024–25',
        pageCount: 5,
        parsedBy: 'rule_based',
        confidenceAverage: 0.98
      },
      {
        id: 'doc-noa-2025',
        fileName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        fileSize: 205000,
        fileType: 'notice_of_assessment',
        uploadDate: '2025-07-26',
        financialYear: '2024–25',
        pageCount: 2,
        parsedBy: 'rule_based',
        confidenceAverage: 0.99
      }
    ],

    assessment: {
      taxableIncome: {
        value: 77480,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Taxable income: $77,480',
        manuallyConfirmed: true
      },
      grossTaxOnTaxableIncome: {
        value: 14032,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Tax on taxable income: $15,331',
        manuallyConfirmed: true
      },
      nonRefundableTaxOffsets: {
        value: 0,
        confidence: 1.0,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Offsets: $0',
        manuallyConfirmed: true
      },
      medicareLevy: {
        value: 1550,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Medicare levy: $1,549',
        manuallyConfirmed: true
      },
      helpCompulsoryRepayment: {
        value: 2712,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'HELP repayment: $2,712',
        manuallyConfirmed: true
      },
      totalTaxAndLevies: {
        value: 18294,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Assessed tax: $19,720',
        manuallyConfirmed: true
      },
      taxWithheldCredit: {
        value: 20384,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Credits withheld: $20,384',
        manuallyConfirmed: true
      },
      assessmentResult: {
        value: 2090,
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Outcome: $2,090 credit refund',
        manuallyConfirmed: true
      },
      isRefund: true,
      issueDate: {
        value: '2025-07-26',
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Issue date: 26 July 2025',
        manuallyConfirmed: true
      },
      noticeReference: {
        value: 'NOA-77192-2025',
        confidence: 0.99,
        sourceDocumentId: 'doc-noa-2025',
        sourceDocumentName: 'ATO-Notice-Of-Assessment-2024-25.pdf',
        sourcePage: 1,
        sourceText: 'Reference: 77192-2025-NOA',
        manuallyConfirmed: true
      }
    },

    alerts: []
  }
];
