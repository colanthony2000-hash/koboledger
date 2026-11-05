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
  Terminal,
  Activity,
  Cpu,
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Acceptance Verification Terminal</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Section 14 Specification</span>
            </span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Tests T-01 through T-23</span>
            <span aria-hidden="true">·</span>
            <span>Invariants INV-01 through INV-13</span>
            <span aria-hidden="true">·</span>
            <span>Continuous Mathematical Audit</span>
          </div>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Auditing Invariants...' : 'Re-Run Verification Suite'}</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5.5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">
              Invariants Status
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {passedCount} / {totalCount} Passed
            </div>
            <span className="text-[11px] text-slate-400">
              {failedCount === 0 ? '100% Invariants Verified' : `${failedCount} Failures Detected`}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5.5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">
              Zero-Sum Invariant (INV-13)
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              Zero-Sum
            </div>
            <span className="text-[11px] text-slate-400">
              Unbalanced entries blocked (T-23)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5.5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">
              Mathematical Precision
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              Exact Kobo
            </div>
            <span className="text-[11px] text-slate-400">
              Absorbs ₦0.02 residual on D-2 Month 4 (T-14)
            </span>
          </div>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="p-4.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Automated Acceptance Tests Suite (Section 14 Specification)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Click row for verification inspection
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
          {testResults.map((test) => {
            const isExpanded = expandedId === test.id;
            const isPassed = test.status === 'passed';

            return (
              <div key={test.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <div
                  onClick={() => toggleExpand(test.id)}
                  className="p-4.5 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
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
                        <span className="font-bold text-slate-900 dark:text-white">
                          {test.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xl font-mono">
                        Expected: {test.expected}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-bold uppercase text-[10px] px-2.5 py-1 rounded-full ${
                        isPassed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
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
                  <div className="px-5 pb-5 pt-1 bg-slate-50/80 dark:bg-[#090C12] border-t border-slate-100 dark:border-white/5 text-xs space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-sans font-bold">
                          Expected Invariant Condition
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">{test.expected}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-sans font-bold">
                          Actual Engine Output
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{test.actual}</span>
                      </div>
                    </div>
                    {test.details && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 p-2.5 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                        <strong className="text-slate-700 dark:text-slate-300">Auditor Invariant Verification:</strong> {test.details}
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
