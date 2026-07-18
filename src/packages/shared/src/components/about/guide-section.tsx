import { useNavigate } from 'react-router-dom';

export function GuideSection() {
  const navigate = useNavigate();
  const steps = [
    {
      num: '01',
      title: '浏览服务目录',
      desc: '首页展示高频场景组合服务，点击卡片进入申请流程。也可在"全部服务"中浏览 7 大领域的原子服务。',
    },
    {
      num: '02',
      title: '提交服务申请',
      desc: '组合服务通过向导式表单填写需求，原子服务通过标准表单提交。支持 AI 智能编排推荐方案。',
    },
    {
      num: '03',
      title: '跟踪交付进度',
      desc: '在"我的工单"中查看申请状态。AI 编排后生成交付方案，可查看可编辑各服务实例的交付详情和网络链路。',
    },
    {
      num: '04',
      title: '确认交付验收',
      desc: '交付完成后，在工单详情中确认验收。基础担当在运营中心确认交付结果。',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold font-semibold mb-6">使用指引</h2>
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.num} className="flex gap-4 p-5 rounded-lg border bg-card">
            <span className="text-2xl font-bold text-primary/30">{s.num}</span>
            <div>
              <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 rounded-lg border bg-info/5 text-center">
        <p className="text-sm text-muted-foreground">
          完整设计文档见{' '}
          <button
            onClick={() => navigate('/handbook')}
            className="text-primary font-medium hover:underline"
          >
            设计手册
          </button>
        </p>
      </div>
    </div>
  );
}
