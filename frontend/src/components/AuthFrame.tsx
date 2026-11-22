import type { ReactNode } from "react";
import { BookOpen } from "react-feather";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr] bg-background">
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-panel border-r border-border">
        <div className="relative z-10 flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="w-9 h-9 rounded-[12px] bg-primary text-white flex items-center justify-center shadow-sm">V</span>
          Veratas
        </div>
        <div className="absolute -right-28 top-[12%] w-[560px] h-[560px] rounded-full border border-white/10 shadow-[0_0_0_70px_rgb(255_255_255_/_3%),0_0_0_140px_rgb(255_255_255_/_2%)]" aria-hidden="true" />
        <div className="relative z-10 max-w-lg">
          <div className="w-14 h-14 rounded-[18px] bg-elevated backdrop-blur-md flex items-center justify-center text-primary shadow-[0_10px_32px_rgb(0_0_0_/_18%)] mb-8">
            <BookOpen size={27} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <p className="text-[clamp(2rem,3.2vw,3.6rem)] leading-[1.08] tracking-[-0.045em] font-semibold text-text">
            Answers from your documents.
          </p>
          <p className="mt-5 text-base text-muted">Source-grounded company knowledge base</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="page-enter w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
