import type { ProcessPhase } from "../types";

export const STANDARD_DELIVERY_PROCESS: ProcessPhase[] = [
  {
    id: "apply",
    title: "需求发起",
    orderStatus: "pending",
    transitionCondition: "需求提交完成 → 进入架构评审",
    trainingTip: "发起阶段保持轻量，通过结构化表单、AI 推荐和咨询入口完成前置引导，不额外增加正式受理字段。",
    userSteps: [
      {
        id: "user-submit",
        label: "提交服务申请",
        description: "选择服务组合，填写需求问卷",
      },
      {
        id: "user-preview",
        label: "AI 推荐方案预览",
        description: "查看 AI 基于需求生成的推荐方案",
        aiAssisted: true,
      },
    ],
    deliverySteps: [
      {
        id: "dev-accept",
        label: "查看需求主单",
        description: "确认申请内容、AI 推荐和材料完整性，必要时引导用户补充",
      },
    ],
    aiAssists: [
      {
        id: "ai-parse",
        label: "需求解析 + 服务匹配",
        description: "自动匹配原子服务，生成推荐编排",
      },
    ],
  },
  {
    id: "review",
    title: "架构评审",
    orderStatus: "reviewing",
    transitionCondition: "架构评审通过 → 进入 ITSM / 资源审批；评审驳回 → 返回待处理",
    trainingTip: "架构评审由客户与供应商架构师共同完成，要把业务必要性、资源边界和风险前置判断清楚。",
    userSteps: [
      {
        id: "user-wait-review",
        label: "补充评审信息",
        description: "按要求补充用途、时长、风险说明等必要信息",
      },
      {
        id: "user-review-feedback",
        label: "接收评审反馈",
        description: "查看是否通过评审或被驳回补充",
      },
    ],
    deliverySteps: [
      {
        id: "dev-review",
        label: "执行架构评审",
        description: "确认架构边界、资源申请合理性、安全风险和后续交付条件",
      },
    ],
    aiAssists: [
      {
        id: "ai-review-summary",
        label: "生成评审摘要",
        description: "汇总需求、套餐规模、风险点和标准建议",
      },
      {
        id: "ai-risk-check",
        label: "标准与风险预检",
        description: "检查资源池余量、合规项和字段完整性",
      },
    ],
  },
  {
    id: "plan",
    title: "审批与交付受理",
    orderStatus: "processing → plan_confirming",
    transitionCondition: "ITSM / 资源审批通过 → 交付中心前台正式受理并提交实施方案 → 用户确认方案",
    trainingTip: "正式交付受理发生在审批通过之后，要明确标准/非标路径、能力域、实施步骤、风险和交付产出。",
    userSteps: [
      {
        id: "user-view-plan",
        label: "查看正式实施方案",
        description: "查看交付中心前台受理后形成的实施步骤、能力域、预计时间和风险说明",
      },
      {
        id: "user-confirm-plan",
        label: "确认或反馈方案",
        description: "确认后进入交付实施；如需调整，可反馈给交付中心重新整理方案",
      },
    ],
    deliverySteps: [
      {
        id: "dev-itsm-approve",
        label: "维护审批回传",
        description: "同步 ITSM / 资源审批单号、链接、审批结果和审批意见",
      },
      {
        id: "dev-accept-delivery",
        label: "交付中心前台正式受理",
        description: "审批通过后选择标准/非标交付路径和涉及能力域",
      },
      {
        id: "dev-make-plan",
        label: "形成实施方案",
        description: "拆解实施步骤、明确前置条件、风险、预计周期和交付产出",
      },
    ],
    aiAssists: [
      {
        id: "ai-orchestrate",
        label: "生成编排方案",
        description: "生成 OrchestratedPlan（resources + integrations）",
      },
      {
        id: "ai-preflight",
        label: "资源可用性预检",
        description: "检查资源池余量、兼容性",
      },
    ],
  },
  {
    id: "deliver",
    title: "交付执行",
    orderStatus: "plan_confirming → delivering",
    transitionCondition: "全部服务交付完成 → 进入验证",
    trainingTip:
      "每个原子服务都有 AI 或手工模式。手工交付的结果录入是数据准确性的关键——录入质量直接影响后续运维。",
    userSteps: [
      {
        id: "user-track",
        label: "接收进度通知",
        description: "实时查看各子服务交付状态",
      },
      {
        id: "user-detail",
        label: "查看交付详情",
        description: "展开查看已交付服务的配置信息",
      },
    ],
    deliverySteps: [
      {
        id: "dev-execute",
        label: "逐服务执行交付",
        description: "按 DeliveryFlowNode 顺序处理每个子服务",
      },
      {
        id: "dev-auto",
        label: "AI 模式服务：自动交付",
        description: "deliveryMode 为 ai 的服务自动完成，结果自动回填",
        deliveryMode: "ai",
      },
      {
        id: "dev-manual",
        label: "手工模式服务：线下执行 + 录入",
        description: "deliveryMode 为 manual 的服务需手工执行，然后在平台录入交付结果数据",
        deliveryMode: "manual",
      },
      {
        id: "dev-error",
        label: "异常处理",
        description: "处理交付失败、降级等情况",
      },
    ],
    aiAssists: [
      {
        id: "ai-auto-deliver",
        label: "自动化交付执行",
        description: "AI 模式服务自动完成配置和交付",
      },
      {
        id: "ai-status-push",
        label: "状态自动推进",
        description: "自动检测完成状态，推进整体进度",
      },
    ],
  },
  {
    id: "verify",
    title: "验证确认",
    orderStatus: "delivering → completed",
    transitionCondition: "用户确认签收 → 进入完成",
    trainingTip:
      "验收不是走形式——站在用户角度，确保交付结果满足最初申请的需求。",
    userSteps: [
      {
        id: "user-test",
        label: "执行验收测试",
        description: "根据交付清单逐项验证",
      },
      {
        id: "user-sign",
        label: "确认签收",
        description: "对服务交付结果签字确认",
      },
    ],
    deliverySteps: [
      {
        id: "dev-report",
        label: "提交验证报告",
        description: "提供测试结果、配置截图",
      },
      {
        id: "dev-fix",
        label: "修复验收问题",
        description: "处理验收中发现的缺陷",
      },
    ],
    aiAssists: [
      {
        id: "ai-verify-report",
        label: "生成验收报告",
        description: "自动汇总交付配置 + 合规检查结果",
      },
      {
        id: "ai-compliance",
        label: "合规性检查",
        description: "检查是否满足 SLA 要求",
      },
    ],
  },
  {
    id: "close",
    title: "交付完成",
    orderStatus: "completed → confirmed → archived",
    transitionCondition: "用户确认验收后可归档入库",
    trainingTip:
      "好的交付结束是好的运维开始，完整的文档交接降低后续运维成本。",
    userSteps: [
      {
        id: "user-live",
        label: "服务正式使用",
        description: "获取访问入口和文档",
      },
      {
        id: "user-feedback",
        label: "评价反馈",
        description: "对交付体验进行评价",
      },
    ],
    deliverySteps: [
      {
        id: "dev-archive",
        label: "交付归档",
        description: "整理交付文档，归档至知识库",
      },
      {
        id: "dev-handover",
        label: "运维交接",
        description: "将服务移交给运维团队",
      },
    ],
    aiAssists: [
      {
        id: "ai-doc",
        label: "生成交付文档",
        description: "自动生成包含所有配置的交付报告",
      },
      {
        id: "ai-knowledge",
        label: "知识库更新",
        description: "将交付案例沉淀至知识库",
      },
    ],
  },
];
