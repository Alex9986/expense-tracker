import type { Metadata } from "next";
import { ClearDataButton } from "@/components/clear-data-button";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeading } from "@/components/ui";

export const metadata: Metadata = { title: "设置" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 text-[13px] last:border-b-0">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="设置" subtitle="数据管理" />

      <Card className="mb-4 max-w-2xl">
        <CardHeading
          title="当前配置"
          subtitle="单用户应用，数据存储在你自己配置的数据库中"
        />
        <Row label="默认币种" value="人民币 CNY（¥）" />
        <Row label="界面语言" value="简体中文" />
        <Row label="深色模式" value={<span className="text-muted">跟随系统</span>} />
        <Row label="账号与多用户" value={<span className="text-muted">未启用</span>} />
      </Card>

      <section className="max-w-2xl">
        <h2 className="mb-2.5 text-[12px] font-semibold tracking-wide text-faint">
          危险操作
        </h2>
        <div className="rounded-2xl border border-danger/35 bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <p className="text-[13.5px] font-semibold">清空所有记账数据</p>
              <p className="mt-1 text-[12.5px] text-muted">
                删除全部收支记录与分类。下次打开时会重新生成一套默认分类。
                此操作不可撤销。
              </p>
            </div>
            <ClearDataButton />
          </div>
        </div>
      </section>
    </>
  );
}
