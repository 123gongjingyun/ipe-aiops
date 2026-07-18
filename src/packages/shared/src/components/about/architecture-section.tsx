export function ArchitectureSection() {
  return (
    <div className="space-y-1" style={{ fontSize: 13, lineHeight: 1.6 }}>

      {/* 第1层：业务价值牵引 */}
      <div
        className="text-white text-center rounded-lg py-3 px-4"
        style={{ background: 'linear-gradient(135deg, #EB0A1E 0%, #B01A22 100%)' }}
      >
        <strong style={{ fontSize: 15 }}>第1层 · 业务价值牵引</strong><br />
        <span style={{ opacity: 0.85, fontSize: 12 }}>数字化方针 → KPI → 需求价值 → 效果回检</span>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 第2层：企业架构治理保障 */}
      <div className="rounded-lg py-3 px-4" style={{ background: '#F0F4FF', border: '2px solid #4F46E5' }}>
        <div className="text-center">
          <strong style={{ color: '#4F46E5', fontSize: 14 }}>第2层 · 企业架构治理保障</strong>
        </div>
        <div className="flex gap-2 mt-2 justify-center flex-wrap" style={{ fontSize: 11 }}>
          {['4A原则', '方案评审', '技术标准', '共通复用', '架构资产'].map(t => (
            <span key={t} className="px-2.5 py-1 rounded" style={{ background: 'white' }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 第3层：IDP 统一数智化交付门户 */}
      <div className="text-white text-center rounded-lg py-3.5 px-4" style={{ background: '#1E293B' }}>
        <strong style={{ fontSize: 15 }}>第3层 · IDP 统一数智化交付门户</strong><br />
        <span style={{ opacity: 0.75, fontSize: 12 }}>
          统一入口 · 统一流程 · <span className="underline">统一服务目录</span> · 统一AI助手 · 统一资产视图
        </span>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 第4层：三条主线 */}
      <div className="rounded-lg p-4" style={{ border: '2px solid #E5E7EB' }}>
        <div className="text-center mb-3 font-semibold" style={{ color: '#475569', fontSize: 13 }}>
          第4层 · 三条主线（两类交付 + 一类保障）
        </div>

        <div className="flex gap-2 mb-2">
          {/* AI-SDLC */}
          <div className="flex-1 rounded-lg p-3" style={{ background: '#ECFDF5', border: '2px solid #10B981' }}>
            <div className="text-center font-bold mb-1" style={{ color: '#059669', fontSize: 13 }}>① AI-SDLC（应用与数据服务开发）</div>
            <div className="text-center" style={{ fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
              需求 → 架构 → 设计 → 开发 → 测试 → 发布 → <strong style={{ color: '#059669' }}>评价</strong><br />
              <span style={{ color: '#059669', fontSize: 10 }}>应用开发｜数据服务开发｜AI辅助需求/设计/编码/测试/评审</span>
            </div>
          </div>
          {/* IPE */}
          <div className="flex-1 rounded-lg p-3" style={{ background: '#FFF7ED', border: '2px solid #EA580C' }}>
            <div className="text-center font-bold mb-1" style={{ color: '#C2410C', fontSize: 13 }}>② IPE 平台服务交付主线</div>
            <div className="text-center" style={{ fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
              申请 → 架构评审 → 审批 → 前台受理 → 交付 → <strong style={{ color: '#C2410C' }}>归档</strong><br />
              <span style={{ color: '#C2410C', fontSize: 10 }}>服务目录｜标准套餐｜实施方案｜资产台账</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-2" style={{ fontSize: 10, color: '#666' }}>
          <span style={{ color: '#059669' }}>AI-SDLC 发布后</span> + <span style={{ color: '#C2410C' }}>IPE 验收后</span> → 共同进入运行态 ↓
        </div>

        {/* AIOps/SRE */}
        <div className="rounded-lg p-3" style={{ background: '#F5F3FF', border: '2px solid #9333EA' }}>
          <div className="text-center font-bold mb-1" style={{ color: '#7C3AED', fontSize: 13 }}>
            ③ AIOps / SRE 运行保障主线 <span style={{ fontSize: 10, opacity: 0.7 }}>（横跨应用与平台）</span>
          </div>
          <div className="text-center" style={{ fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
            监控 → 告警 → 诊断 → 恢复 → 优化 → <strong style={{ color: '#7C3AED' }}>反馈</strong><br />
            <span style={{ color: '#7C3AED', fontSize: 10 }}>SLO｜MTTR｜可观测｜容量｜自愈｜知识沉淀</span>
          </div>
        </div>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 安全护栏 */}
      <div className="rounded-lg py-3 px-4" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FFEDD5 100%)', border: '2px solid #DC2626' }}>
        <div className="text-center">
          <strong style={{ color: '#991B1B', fontSize: 14 }}>横向贯穿 · DevSecOps / SOC 安全治理护栏</strong>
        </div>
        <div className="flex gap-2 mt-2 justify-center flex-wrap" style={{ fontSize: 11 }}>
          {['身份权限', '代码安全', '数据安全', '漏洞扫描', '合规审计', '安全监测', '事件响应'].map(t => (
            <span key={t} className="px-2.5 py-1 rounded" style={{ background: 'white', border: '1px solid #FCA5A5' }}>{t}</span>
          ))}
        </div>
        <div className="flex gap-2 mt-2.5 justify-center" style={{ fontSize: 10 }}>
          <div className="px-2.5 py-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#059669' }}>
            → AI-SDLC：代码安全 · 依赖检查 · SAST/DAST · AI代码审查
          </div>
          <div className="px-2.5 py-1 rounded" style={{ background: 'rgba(234,88,12,0.15)', color: '#C2410C' }}>
            → IPE：网络安全 · 云安全 · 基线检查 · 资源合规
          </div>
          <div className="px-2.5 py-1 rounded" style={{ background: 'rgba(147,51,234,0.15)', color: '#7C3AED' }}>
            → AIOps/SRE：安全监测 · 告警联动 · 事件响应 · 威胁检测
          </div>
        </div>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 第5层：资产与能力底座 */}
      <div className="rounded-lg p-4" style={{ border: '2px solid #F59E0B' }}>
        <div className="text-center mb-2.5 font-semibold" style={{ color: '#92400E', fontSize: 13 }}>
          第5层 · 企业级资产与能力底座
        </div>

        {/* 九类资产 */}
        <div className="rounded-md py-2.5 px-3 mb-2" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
          <div className="text-center font-semibold mb-1.5" style={{ color: '#B45309', fontSize: 11 }}>企业级知识资产底座</div>
          <div className="flex gap-1.5 justify-center flex-wrap" style={{ fontSize: 10 }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>A 业务资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>B 架构资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>C 设计资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #93C5FD' }}>D 数据资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>E 代码/工程资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>F 测试资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>G 运行资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: 'white' }}>H 治理资产</span>
            <span className="px-2 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>I 安全资产</span>
          </div>
          <div className="flex gap-1 justify-center flex-wrap mt-1.5" style={{ fontSize: 9, color: '#1D4ED8' }}>
            <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF' }}>数据目录</span>
            <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF' }}>数据标准</span>
            <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF' }}>数据模型</span>
            <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF' }}>指标标签</span>
          </div>
        </div>

        {/* 三大底座 */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-md py-2 px-3 text-center" style={{ background: '#F1F5F9', border: '1px solid #94A3B8' }}>
            <strong style={{ fontSize: 11, color: '#475569' }}>工具链与共通服务</strong><br />
            <span style={{ fontSize: 9, color: '#64748B' }}>IDE · GitLab · CI/CD · SonarQube · 制品库 · 测试平台 · API网关 · <span style={{ color: '#1D4ED8' }}>AI服务</span></span>
          </div>
          <div className="flex-1 rounded-md py-2 px-3 text-center" style={{ background: '#F1F5F9', border: '1px solid #94A3B8' }}>
            <strong style={{ fontSize: 11, color: '#475569' }}>基础技术平台服务底座</strong><br />
            <span style={{ fontSize: 9, color: '#64748B' }}>云 · 容器 · DB · 中间件 · 网络 · 安全 · CMDB · 监控 · 物理机 · 机房 · 边缘计算 · AI算力</span>
          </div>
          <div className="flex-1 rounded-md py-2 px-3 text-center" style={{ background: '#F1F5F9', border: '1px solid #94A3B8' }}>
            <strong style={{ fontSize: 11, color: '#475569' }}>AI与知识运营底座</strong><br />
            <span style={{ fontSize: 9, color: '#64748B' }}>知识库 · 向量DB · 大模型网关 · Agent · Skill管理</span>
          </div>
        </div>
      </div>

      {/* 运营闭环 */}
      <div className="text-center py-2.5 px-4 rounded-md mt-2" style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', fontSize: 12, color: '#475569' }}>
        <strong>运营闭环（数据驱动的持续改进）：</strong>运行反馈 → 架构刷新 → 流程优化 → 资产沉淀 → AI复用 → 持续改善
      </div>
    </div>
  );
}
