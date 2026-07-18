import { useState } from 'react';
import { ChevronDown, ChevronRight, CircleHelp, LifeBuoy, Mail, Phone, PanelsTopLeft, Workflow, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Section {
  title: string;
  items: { q: string; a: string }[];
}

const sections: Section[] = [
  {
    title: '平台说明',
    items: [
      {
        q: 'GTMC 数智化交付平台是什么？',
        a: 'GTMC 数智化交付平台提供统一的需求发起、评审跟踪、方案确认、交付执行与运行保障入口。当前 Portal V2 版本优先聚焦资源申请前的信息整理、材料导出与后续申请查看。',
      },
      {
        q: 'IPE 平台服务交付在这里承担什么角色？',
        a: 'IPE 平台服务交付负责基础设施与平台能力的标准化申请、评审衔接和后续交付承接。当前 V2 先把入口层整理清楚，让用户先把申请材料准备完整，后续再逐步衔接正式流程。',
      },
      {
        q: '为什么现在首页先强调资源申请工作台？',
        a: '因为这轮重点是先解决用户“从哪里开始、怎么把申请材料填清楚”的问题。等用户验证通过后，再逐步向审批、交付、验收等完整流程延伸。',
      },
    ],
  },
  {
    title: '常见问题',
    items: [
      {
        q: '为什么首页默认是资源申请工作台？',
        a: '因为当前阶段优先解决“用户如何完成申请材料填写并导出”的问题。新用户默认从工作台进入，可以减少入口判断成本。',
      },
      {
        q: '服务目录和工作台是什么关系？',
        a: '工作台是主入口，适合先梳理需求；服务目录是老手第二入口，适合已明确申请项后按模板快速进入。',
      },
      {
        q: '当前 Portal V2 做到了哪一步？',
        a: '本轮主要完成入口层重构，包括左侧导航、首页工作台、常见资源申请、服务目录迁移，以及帮助中心与填写辅助入口的收口。审批、交付和工单详情等后续流程仍沿用现有页面。',
      },
    ],
  },
  {
    title: '申请与工单问题',
    items: [
      {
        q: '申请被退回怎么办？',
        a: '如果申请在评审阶段被退回，可根据评审意见补齐业务边界、资源规模、安全要求或附件材料后重新提交。',
      },
      {
        q: '如何查看现有申请和后续进度？',
        a: '发起前整理中的材料，进入“资源申请单”查看；已经进入正式审批、交付、验收阶段的内容，进入“我的工单”查看。',
      },
      {
        q: '已经进入后续审批或交付阶段，还能改吗？',
        a: '进入正式后续阶段后，不建议直接在入口页修改，应先联系交付或审批相关人员确认影响范围，再决定是否重新发起或补充说明。',
      },
    ],
  },
  {
    title: '支持方式',
    items: [
      {
        q: '遇到页面问题找谁？',
        a: '优先联系 Portal / IPE 支持人员，说明当前页面、操作步骤、截图和预期结果，方便快速定位问题。',
      },
      {
        q: '遇到申请口径问题找谁？',
        a: '优先联系资源申请受理方或架构评审相关人员，确认资源边界、网络要求、SLA、安全或容灾等口径。',
      },
    ],
  },
];

export function Help() {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#fef7f5_100%)] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <LifeBuoy className="h-3.5 w-3.5" />
              支持与 FAQ
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">帮助中心</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              这里统一承接平台说明、常见问题和支持方式。如果你想看“申请材料该怎么填”，可在常见资源申请页或填写工作区进入填写说明。
            </p>
          </div>
          <button
            onClick={() => navigate('/guide')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <CircleHelp className="h-4 w-4" />
            前往填写说明
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <PanelsTopLeft className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">平台概览入口</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          老版本 `#/about` 的平台介绍、协作架构和使用指引内容没有删除，当前统一收在帮助中心里，通过下面入口查看。
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <Link
            to="/about"
            className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">平台介绍</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">查看平台定位、主线能力和整体架构说明。</div>
          </Link>
          <Link
            to="/about/collab"
            className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <Workflow className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">协作架构</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">查看业务、交付、平台工程、AIOps/SRE 与安全协作关系。</div>
          </Link>
          <Link
            to="/about/guide"
            className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <CircleHelp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">使用指引</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">查看老版本关于服务浏览、申请、跟踪和验收的使用步骤。</div>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <Phone className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">支持渠道</h2>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">
            紧急问题建议联系值班支持或交付窗口，普通问题可统一通过 Portal / IPE 支持人员跟进。
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">反馈建议</h2>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">
            反馈时建议附带页面路径、操作步骤、截图和预期结果，能显著减少沟通来回。
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <CircleHelp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">内容边界</h2>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">
            帮助中心负责 FAQ 和支持问题；填写说明作为辅助入口，负责教用户如何准备和填写申请材料。
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {sections.map(section => (
          <section key={section.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map(item => {
                const key = `${section.title}-${item.q}`;
                const isOpen = openItems.has(key);
                return (
                  <div key={key} className="overflow-hidden rounded-md border">
                    <button
                      onClick={() => toggle(key)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      {isOpen ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">{item.q}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 pl-11">
                        <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
