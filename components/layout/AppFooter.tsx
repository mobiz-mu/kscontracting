// components/layout/AppFooter.tsx
"use client";

export default function AppFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="flex flex-col gap-2 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>© {new Date().getFullYear()} KS CONTRACTING LTD. All rights reserved.</div>
        <div>
          Built by <span className="font-semibold text-[#071b38]">MoBiz.mu</span>
        </div>
      </div>
    </footer>
  );
}