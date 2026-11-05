import React, { useState, useEffect } from 'react';
import { runAllAcceptanceTests, TestCaseResult } from '../services/testRunner';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const AcceptanceTestsView: React.FC = () => {
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runAllAcceptanceTests();
      setTestResults(results);
      setIsRunning(false);
    }, 250);
  };

  useEffect(() => {
    executeTests();
  }, []);

  const passedCount = testResults.filter((t) => t.status === 'passed').length;
  const failedCount = testResults.filter((t) => t.status === 'failed').length;
  const totalCount = testResults.length;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Acceptance Tests & Accounting Invariants (Section 14)
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Tests T-01 through T-23</span>
            <span aria-hidden="true">·</span>
            <span>Invariants INV-01 through INV-13</span>
            <span aria-hidden="true">·</span>
            <span>Automated Audit Verification</span>
          </div>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Auditing Engine...' : 'Re-Run Test Suite'}</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
              Test Suite Status
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {passedCount} / {totalCount} Passed
            </div>
            <span className="text-[11px] text-slate-500">
              {failedCount === 0 ? '100% Invariants Verified' : `${failedCount} Failed`}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
              Double-Entry Invariant (INV-13)
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              Zero-Sum
            </div>
            <span className="text-[11px] text-slate-500">
              Unbalanced transactions rejected (T-23)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
              Mathematical Precision
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              Exact Kobo
            </div>
            <span className="text-[11px] text-slate-500">
              Absorbs ₦0.02 residual on D-2 Month 4 (T-14)
            </span>
          </div>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Acceptance Tests Results (Section 14 Specification)
          </h2>
          <span className="text-xs text-slate-500">
            Click row for verification details
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {testResults.map((test) => {
            const isExpanded = expandedId === test.id;
            const isPassed = test.status === 'passed';

            return (
              <div key={test.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <div
                  onClick={() => toggleExpand(test.id)}
                  className="p-4 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          [{test.id}]
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {test.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xl">
                        Expected: {test.expected}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded font-mono ${
                        isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {test.status}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/60 dark:bg-slate-850/40 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                      <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block mb-1 font-sans">
                          Expected Condition (Blueprint v1.1)
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">{test.expected}</span>
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block mb-1 font-sans">
                          Actual Engine Output
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{test.actual}</span>
                      </div>
                    </div>
                    {test.details && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                        <strong>Auditor Verification Note:</strong> {test.details}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
