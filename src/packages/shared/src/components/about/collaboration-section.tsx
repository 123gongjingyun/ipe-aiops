export function CollaborationSection() {
  return (
    <div className="space-y-1" style={{ fontSize: 12, lineHeight: 1.6 }}>

      {/* 业务价值 */}
      <div
        className="text-white text-center rounded-lg py-2.5 px-4"
        style={{ background: 'linear-gradient(135deg, #EB0A1E 0%, #B01A22 100%)' }}
      >
        <strong style={{ fontSize: 14 }}>业务价值 / 数字化方针 / KPI</strong><br />
        <span style={{ opacity: 0.85, fontSize: 11 }}>战略承接 ｜ 业务目标 ｜ 价值度量</span>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 业务协作流程 */}
      <div className="rounded-lg py-2 px-4" style={{ background: '#EFF6FF', border: '1px solid #93C5FD' }}>
        <div className="flex items-center justify-center gap-1.5 flex-wrap" style={{ fontSize: 10 }}>
          <span className="font-semibold px-2 py-0.5 rounded" style={{ color: '#1D4ED8', background: 'white' }}>业务部门</span>
          <span className="font-semibold px-2 py-0.5 rounded" style={{ color: '#1D4ED8', background: 'white' }}>产品团队 / POA创新小组</span>
          <span style={{ color: '#93C5FD' }}>→</span>
          <span className="font-semibold px-2 py-0.5 rounded" style={{ color: '#C2410C', background: '#FFF7ED' }}>需求入口</span>
          <span style={{ color: '#93C5FD' }}>→</span>
          <span style={{ color: '#475569' }}>IDP 统一门户</span>
          <span style={{ color: '#93C5FD' }}>→ ... →</span>
          <span className="font-semibold px-2 py-0.5 rounded" style={{ color: '#7C3AED', background: '#F5F3FF' }}>试行 &amp; 运营反馈</span>
          <span style={{ color: '#93C5FD' }}>→</span>
          <span style={{ color: '#475569' }}>运行评价 · 价值回检</span>
        </div>
      </div>
      <div className="text-center text-muted-foreground" style={{ fontSize: 11 }}>▼</div>

      {/* 主体三栏 */}
      <div className="flex gap-2">

        {/* 左栏：交付角色 */}
        <div className="flex flex-col gap-1.5" style={{ minWidth: 110 }}>
          <div className="rounded-md text-center py-2 px-2" style={{ background: '#F0F4FF', border: '2px solid #4F46E5', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#4F46E5' }}>架构治理团队<br />EAC / 领域架构师</div>
            <div style={{ color: '#4F46E5', fontSize: 9 }}>4A原则｜方案评审<br />标准规范｜架构资产</div>
          </div>
          <div className="rounded-md text-center py-2 px-2" style={{ background: '#ECFDF5', border: '2px solid #10B981', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#059669' }}>IT交付团队 / POB</div>
            <div style={{ color: '#374151' }}>任务管理<br />设计开发<br />测试发布</div>
          </div>
          <div className="rounded-md text-center py-2 px-2" style={{ background: '#F1F5F9', border: '1px solid #94A3B8', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#475569' }}>开发资源池</div>
            <div style={{ color: '#6B7280' }}>供应商 / 外部资源</div>
          </div>
          <div className="text-center" style={{ fontSize: 9, color: '#999' }}>→ 进入 IDP</div>
        </div>

        {/* 中栏：平台核心 */}
        <div className="flex-1 flex flex-col gap-1.5">

          {/* IDP */}
          <div className="text-white text-center rounded-lg py-3 px-4" style={{ background: '#1E293B' }}>
            <strong style={{ fontSize: 14 }}>IDP 统一数智化交付门户</strong><br />
            <span style={{ opacity: 0.75, fontSize: 11 }}>
              统一入口 ｜ 统一流程 ｜ <span className="underline">统一服务目录</span> ｜ 统一AI助手 ｜ 统一资产视图
            </span>
          </div>

          {/* 三条主线 */}
          <div className="rounded-lg p-3" style={{ border: '2px solid #E5E7EB' }}>
            <div className="flex gap-2 mb-2">
              {/* AI-SDLC */}
              <div className="flex-1 rounded-lg p-2.5" style={{ background: '#ECFDF5', border: '2px solid #10B981' }}>
                <div className="text-center font-bold mb-1" style={{ color: '#059669', fontSize: 12 }}>① AI-SDLC（应用与数据服务开发）</div>
                <div className="text-center" style={{ fontSize: 10, color: '#374151', lineHeight: 1.7 }}>
                  需求 → 架构 → 设计 → 开发 → 测试 → 发布 → <strong style={{ color: '#059669' }}>评价</strong><br />
                  <span style={{ color: '#059669', fontSize: 9 }}>应用开发｜数据服务开发｜AI辅助需求/设计/编码/测试/评审</span>
                </div>
              </div>
              {/* IPE */}
              <div className="flex-1 rounded-lg p-2.5" style={{ background: '#FFF7ED', border: '2px solid #EA580C' }}>
                <div className="text-center font-bold mb-1" style={{ color: '#C2410C', fontSize: 12 }}>② IPE 平台服务交付主线</div>
                <div className="text-center" style={{ fontSize: 10, color: '#374151', lineHeight: 1.7 }}>
                  申请 → 架构评审 → 审批 → 前台受理 → 交付 → <strong style={{ color: '#C2410C' }}>归档</strong><br />
                  <span style={{ color: '#C2410C', fontSize: 9 }}>服务目录｜标准套餐｜实施方案｜资产台账</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-1.5" style={{ fontSize: 9, color: '#666' }}>
              <span style={{ color: '#059669' }}>AI-SDLC 发布后</span> + <span style={{ color: '#C2410C' }}>IPE 验收后</span> → 共同进入运行态 ↓
            </div>

            {/* AIOps/SRE */}
            <div className="rounded-lg p-2.5" style={{ background: '#F5F3FF', border: '2px solid #9333EA' }}>
              <div className="text-center font-bold mb-1" style={{ color: '#7C3AED', fontSize: 12 }}>
                ③ AIOps / SRE 运行保障主线 <span style={{ fontSize: 9, opacity: 0.7 }}>（横跨应用与平台）</span>
              </div>
              <div className="text-center" style={{ fontSize: 10, color: '#374151', lineHeight: 1.7 }}>
                监控 → 告警 → 诊断 → 恢复 → 优化 → <strong style={{ color: '#7C3AED' }}>反馈</strong><br />
                <span style={{ color: '#7C3AED', fontSize: 9 }}>SLO｜MTTR｜可观测｜自动化｜自愈｜知识沉淀</span>
              </div>
            </div>
          </div>

          {/* 安全护栏 */}
          <div className="rounded-lg py-2.5 px-4" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FFEDD5 100%)', border: '2px solid #DC2626' }}>
            <div className="text-center">
              <strong style={{ color: '#991B1B', fontSize: 12 }}>DevSecOps / SOC 安全治理护栏 <span style={{ fontSize: 9, opacity: 0.7 }}>（贯穿全生命周期）</span></strong>
            </div>
            <div className="flex gap-1.5 mt-1.5 justify-center flex-wrap" style={{ fontSize: 10 }}>
              {['身份权限', '代码安全', '数据安全', '漏洞扫描', '合规审计', '安全监测', '事件响应'].map(t => (
                <span key={t} className="px-2 py-0.5 rounded" style={{ background: 'white', border: '1px solid #FCA5A5' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* 工具链 */}
          <div className="rounded-md py-2 px-3" style={{ background: '#F1F5F9', border: '1px solid #94A3B8' }}>
            <div className="text-center font-semibold mb-1" style={{ color: '#475569', fontSize: 11 }}>工具链与共通服务</div>
            <div className="flex gap-1.5 justify-center flex-wrap" style={{ fontSize: 9, color: '#64748B' }}>
              {['开发工具集', '测试工具集', 'AI工具集', 'API网关'].map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: 'white' }}>{t}</span>
              ))}
              <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>AI服务</span>
            </div>
          </div>

          {/* 底座 */}
          <div className="rounded-lg py-2.5 px-3" style={{ border: '2px solid #F59E0B' }}>
            <div className="text-center font-semibold mb-1" style={{ color: '#92400E', fontSize: 11 }}>基础技术平台服务底座</div>
            <div className="flex gap-1.5 justify-center flex-wrap" style={{ fontSize: 9, color: '#64748B' }}>
              {['云', '容器', 'DB', '中间件', '网络', '安全', 'CMDB', '监控', '日志', '物理机', '机房', '边缘计算', 'AI算力'].map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: 'white' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* 知识资产 */}
          <div className="rounded-md py-2.5 px-3" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
            <div className="text-center font-semibold mb-1" style={{ color: '#B45309', fontSize: 11 }}>企业级知识资产底座</div>
            <div className="flex gap-1 justify-center flex-wrap mb-1" style={{ fontSize: 9 }}>
              {['A 业务资产', 'B 架构资产', 'C 设计资产'].map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: 'white' }}>{t}</span>
              ))}
              <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #93C5FD' }}>D 数据资产</span>
              {['E 代码/工程资产', 'F 测试资产', 'G 运行资产', 'H 治理资产'].map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: 'white' }}>{t}</span>
              ))}
              <span className="px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>I 安全资产</span>
            </div>
            <div className="flex gap-1 justify-center flex-wrap" style={{ fontSize: 9, color: '#1D4ED8' }}>
              {['数据目录', '数据标准', '数据模型', '指标标签'].map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* AI赋能 */}
          <div className="rounded-md py-2 px-3" style={{ background: '#F0F4FF', border: '1px solid #818CF8' }}>
            <div className="text-center font-semibold mb-1" style={{ color: '#4F46E5', fontSize: 11 }}>AI 赋能</div>
            <div className="flex gap-1.5 justify-center flex-wrap" style={{ fontSize: 9, color: '#4F46E5' }}>
              {['大模型网关', 'Agent管理', 'Skill管理', '提示词库', '知识图谱'].map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: 'white' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 右栏：支撑团队 */}
        <div className="flex flex-col gap-1.5" style={{ minWidth: 120 }}>
          <div className="text-white text-center rounded-md py-1.5 px-2" style={{ background: '#1E293B', fontSize: 10 }}>
            <div className="font-semibold mb-0.5">平台工程团队</div>
            <div style={{ opacity: 0.75, fontSize: 9 }}>平台建设｜工具链集成<br />服务目录｜开发者体验</div>
          </div>
          <div className="text-center rounded-md py-1.5 px-2" style={{ background: '#F5F3FF', border: '2px solid #9333EA', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#7C3AED' }}>统合运维中心（大一线）</div>
            <div style={{ color: '#6B7280', fontSize: 9 }}>事件｜问题｜变更<br />发布｜服务水平</div>
          </div>
          <div className="text-center rounded-md py-1.5 px-2" style={{ background: '#F5F3FF', border: '1px solid #C4B5FD', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#7C3AED' }}>AIOps / SRE 团队</div>
            <div style={{ color: '#6B7280', fontSize: 9 }}>可观测｜自动化<br />可靠性｜容量性能</div>
          </div>
          <div className="text-center rounded-md py-1.5 px-2" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#991B1B' }}>安全中心（SOC / CISO）</div>
            <div style={{ color: '#6B7280', fontSize: 9 }}>安全治理｜威胁监测<br />合规审计｜事件响应</div>
          </div>
          <div className="text-center rounded-md py-1.5 px-2" style={{ background: '#FFF7ED', border: '1px solid #FDBA74', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#C2410C' }}>平台能力域团队</div>
            <div style={{ color: '#6B7280', fontSize: 9 }}>基础平台｜数据服务<br />AI能力｜安全｜可靠性</div>
          </div>
          <div className="text-center rounded-md py-1.5 px-2" style={{ background: '#F0F4FF', border: '1px solid #818CF8', fontSize: 10 }}>
            <div className="font-semibold mb-0.5" style={{ color: '#4F46E5' }}>企业数智化员工<br /><span style={{ fontSize: 9, opacity: 0.8 }}>AI Agent 助手群</span></div>
            <div style={{ color: '#4F46E5', fontSize: 9 }}>需求Agent｜设计Agent<br />开发Agent｜数据Agent<br />运维Agent｜评审Agent</div>
          </div>
        </div>
      </div>

      {/* 运营闭环 */}
      <div className="text-center py-2 px-3 rounded-md mt-1" style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', fontSize: 11, color: '#475569' }}>
        <strong>运营闭环（数据驱动的持续改进）：</strong>运行反馈 → 架构刷新 → 流程优化 → 资产沉淀 → AI复用 → 持续改善
      </div>

      {/* 底部总结 */}
      <div className="text-white text-center rounded-md py-2 px-3" style={{ background: '#1E293B', fontSize: 10, lineHeight: 1.6 }}>
        以业务价值牵引，以IDP统一协同，以AI-SDLC与IPE驱动交付，以AIOps/SRE保障运行，以安全治理为护栏，以资产与知识底座支撑AI复用
      </div>
    </div>
  );
}
