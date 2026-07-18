export function AboutContent() {
  const lines = [
    {
      title: 'IPE 平台服务交付',
      desc: '基础设施服务的标准化、自助化交付。需求发起→架构评审→ITSM/资源审批→交付中心前台受理→方案确认→交付实施→验收归档，通过服务目录和标准套餐支撑交付闭环。',
      icon: '📦',
      bg: 'bg-warning/5',
      color: 'text-warning font-semibold',
    },
    {
      title: 'AIOps/SRE 运行保障',
      desc: '横跨应用与平台的运行保障体系。可观测性、可靠性工程、事件故障管理、发布管理、持续优化五大能力域。',
      icon: '🔧',
      bg: 'bg-error/5',
      color: 'text-error font-semibold',
    },
    {
      title: 'AI-SDLC 应用与数据服务开发',
      desc: '数字化应用与数据服务从需求到评价的全生命周期交付，AI 嵌入各阶段辅助需求、设计、编码、测试和评审。',
      icon: '🤖',
      bg: 'bg-success/5',
      color: 'text-success font-semibold',
      note: '后续规划',
    },
    {
      title: 'DevSecOps/SOC 安全护栏',
      desc: '横向贯穿三条主线的安全治理体系。代码安全、依赖检查、资源合规、安全监测、事件响应，非独立第四条线。',
      icon: '🛡️',
      bg: 'bg-primary/5',
      color: 'text-primary',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold mb-2">GTMC 数智化交付平台</h1>
        <p className="text-muted-foreground">AI-Native 工程交付与运营统一体系</p>
        <p className="text-lg font-medium mt-4 text-primary">从结构化需求到可验收交付</p>
      </div>

      {/* Architecture SVG — v4 五层结构 */}
      <div className="mb-10 p-6 bg-card border rounded-lg">
        <h2 className="text-2xl font-bold font-semibold mb-6 text-center text-foreground">平台架构（v4）</h2>
        <svg viewBox="0 0 800 540" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Background */}
          <rect x="0" y="0" width="800" height="540" fill="#FEF5F4" rx="8" />

          {/* 第1层：业务价值牵引 — 品牌红 */}
          <rect x="12" y="14" width="776" height="46" rx="8" fill="#EB0A1E" fillOpacity="0.08" stroke="#EB0A1E" strokeWidth="1" />
          <text x="400" y="34" textAnchor="middle" fontSize="13" fontWeight="600" fill="#EB0A1E">第1层 · 业务价值牵引</text>
          <text x="400" y="50" textAnchor="middle" fontSize="10" fill="#B01A22">数字化方针 → KPI → 需求价值 → 效果回检</text>

          {/* Arrow */}
          <line x1="400" y1="62" x2="400" y2="72" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points="396,70 404,70 400,76" fill="#CBD5E1" />

          {/* 第2层：企业架构治理保障 — 靛蓝 */}
          <rect x="12" y="78" width="776" height="46" rx="8" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="1" />
          <text x="400" y="98" textAnchor="middle" fontSize="13" fontWeight="600" fill="#4F46E5">第2层 · 企业架构治理保障</text>
          <text x="400" y="114" textAnchor="middle" fontSize="10" fill="#4F46E5">4A原则 · 方案评审 · 技术标准 · 共通复用 · 架构资产</text>

          {/* Arrow */}
          <line x1="400" y1="126" x2="400" y2="136" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points="396,134 404,134 400,140" fill="#CBD5E1" />

          {/* 第3层：IDP 统一数智化交付门户 — 深色 */}
          <rect x="12" y="142" width="776" height="46" rx="8" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          <text x="400" y="162" textAnchor="middle" fontSize="13" fontWeight="600" fill="white">第3层 · IDP 统一数智化交付门户</text>
          <text x="400" y="178" textAnchor="middle" fontSize="10" fill="#94A3B8">统一入口 · 统一流程 · 统一服务目录 · 统一AI助手 · 统一资产视图</text>

          {/* Arrow */}
          <line x1="400" y1="190" x2="400" y2="200" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points="396,198 404,198 400,204" fill="#CBD5E1" />

          {/* 第4层：三条主线 */}
          <rect x="12" y="206" width="776" height="155" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          <text x="400" y="224" textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569">第4层 · 三条主线（两类交付 + 一类保障）</text>

          {/* 上排：AI-SDLC + IPE */}
          {/* AI-SDLC（灰色标注范围外） */}
          <rect x="24" y="232" width="370" height="48" rx="6" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4 2" />
          <text x="209" y="252" textAnchor="middle" fontSize="12" fontWeight="600" fill="#9CA3AF">① AI-SDLC（应用与数据服务开发）</text>
          <text x="209" y="268" textAnchor="middle" fontSize="9" fill="#9CA3AF">范围外 — 后续规划</text>

          {/* IPE */}
          <rect x="406" y="232" width="370" height="48" rx="6" fill="#FFF7ED" stroke="#EA580C" strokeWidth="1" />
          <text x="591" y="252" textAnchor="middle" fontSize="12" fontWeight="600" fill="#C2410C">② IPE 平台服务交付主线</text>
          <text x="591" y="268" textAnchor="middle" fontSize="9" fill="#92400E">申请 → 架构评审 → 审批 → 前台受理 → 交付 → 归档</text>

          {/* 本期聚焦标签 */}
          <rect x="406" y="286" width="246" height="20" rx="10" fill="#EA580C" fillOpacity="0.1" stroke="#EA580C" strokeWidth="0.5" />
          <text x="529" y="300" textAnchor="middle" fontSize="9" fill="#C2410C" fontWeight="600">← 本期原型聚焦</text>

          {/* 交接点 */}
          <text x="400" y="316" textAnchor="middle" fontSize="9" fill="#666">
            <tspan fill="#C2410C">IPE 验收后</tspan> → 进入运行态 ↓
          </text>

          {/* AIOps/SRE */}
          <rect x="200" y="324" width="400" height="28" rx="6" fill="#FAF5FF" stroke="#9333EA" strokeWidth="1" />
          <text x="400" y="343" textAnchor="middle" fontSize="11" fontWeight="600" fill="#7C3AED">③ AIOps/SRE 运行保障主线（横跨应用与平台）</text>

          {/* AIOps/SRE 聚焦标签 */}
          <rect x="410" y="352" width="180" height="16" rx="8" fill="#9333EA" fillOpacity="0.1" stroke="#9333EA" strokeWidth="0.5" />
          <text x="500" y="363" textAnchor="middle" fontSize="8" fill="#7C3AED" fontWeight="600">← 本期原型聚焦</text>

          {/* Arrow */}
          <line x1="400" y1="370" x2="400" y2="380" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points="396,378 404,378 400,384" fill="#CBD5E1" />

          {/* 安全护栏 — 横向贯穿 */}
          <rect x="12" y="386" width="776" height="44" rx="8" fill="#FEF3C7" fillOpacity="0.5" stroke="#DC2626" strokeWidth="1" />
          <text x="400" y="405" textAnchor="middle" fontSize="12" fontWeight="600" fill="#991B1B">横向贯穿 · DevSecOps / SOC 安全治理护栏</text>
          <text x="400" y="421" textAnchor="middle" fontSize="9" fill="#991B1B">代码安全 · 依赖检查 · 资源合规 · 安全监测 · 事件响应</text>

          {/* Arrow */}
          <line x1="400" y1="432" x2="400" y2="442" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points="396,440 404,440 400,446" fill="#CBD5E1" />

          {/* 第5层：企业级资产与能力底座 — 琥珀 */}
          <rect x="12" y="448" width="776" height="80" rx="8" fill="#FEF3C7" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="1" />
          <text x="400" y="468" textAnchor="middle" fontSize="12" fontWeight="600" fill="#92400E">第5层 · 企业级资产与能力底座</text>

          {/* 九类资产标签 */}
          {[
            'A 业务', 'B 架构', 'C 设计', 'D 数据', 'E 代码',
            'F 测试', 'G 运行', 'H 治理', 'I 安全',
          ].map((name, i) => (
            <g key={name}>
              <rect x={24 + i * 84} y="476" width="76" height="20" rx="4" fill="white" stroke="#FCD34D" strokeWidth="0.5" />
              <text x={62 + i * 84} y="490" textAnchor="middle" fontSize="9" fill="#92400E">{name}</text>
            </g>
          ))}

          {/* 三大底座 */}
          <text x="134" y="518" textAnchor="middle" fontSize="9" fill="#92400E" fontWeight="500">工具链与共通服务</text>
          <text x="400" y="518" textAnchor="middle" fontSize="9" fill="#92400E" fontWeight="500">基础技术平台服务底座</text>
          <text x="666" y="518" textAnchor="middle" fontSize="9" fill="#92400E" fontWeight="500">AI与知识运营底座</text>
        </svg>
      </div>

      {/* Three Lines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {lines.map(v => (
          <div key={v.title} className={`p-5 rounded-xl border ${v.bg} relative`}>
            {v.note && (
              <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-muted/20 text-muted">
                {v.note}
              </span>
            )}
            <div className="text-2xl mb-2">{v.icon}</div>
            <h3 className={`font-semibold text-sm mb-1 ${v.color}`}>{v.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Current Scope */}
      <div className="mb-10 p-5 rounded-xl border border-info/20 bg-info/5">
        <h3 className="font-semibold text-sm mb-2 text-info font-semibold">当前原型演示范围</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          当前原型聚焦 <strong className="text-foreground">IPE 平台服务交付</strong> 和 <strong className="text-foreground">AIOps/SRE 运行保障</strong> 两个维度，
          演示从服务申请、智能编排、自动化交付到运行保障的完整流程。AI-SDLC 应用与数据服务开发将在后续阶段落地。
        </p>
      </div>

      {/* Get Started */}
      <div className="text-center py-8 bg-primary/5 rounded-xl">
        <h2 className="font-semibold mb-2">开始使用</h2>
        <p className="text-sm text-muted-foreground mb-4">选择一个服务组合，快速体验智能交付流程</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => window.location.hash = '/'}
            className="px-6 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            浏览服务目录
          </button>
        </div>
      </div>
    </div>
  );
}
