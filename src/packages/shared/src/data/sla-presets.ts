import type { ServiceSLASpec, ServiceFlowSpec } from "../types";

export const SLA_PRESETS: Record<string, ServiceSLASpec> = {
  gold: {
    level: "gold",
    availability: "99.99%",
    rto: "30min",
    rpo: "5min",
    responseTime: "15min",
    maintenanceWindow: "每月第二个周日 02:00-06:00",
    escalationPolicy: "15min未响应升级至主管，30min升级至经理",
  },
  silver: {
    level: "silver",
    availability: "99.9%",
    rto: "4h",
    rpo: "1h",
    responseTime: "30min",
    maintenanceWindow: "每月第二个周六 22:00-次日06:00",
    escalationPolicy: "30min未响应升级至主管",
  },
  bronze: {
    level: "bronze",
    availability: "99.5%",
    rto: "8h",
    rpo: "24h",
    responseTime: "2h",
    maintenanceWindow: "每月第二个周六 22:00-次日06:00",
    escalationPolicy: "2h未响应升级至主管",
  },
};

export const STANDARD_FLOW: ServiceFlowSpec = {
  id: "flow-standard",
  name: "标准交付流程",
  nodes: [
    { status: "pending", label: "待处理", next: ["reviewing"], actions: ["assign"] },
    { status: "reviewing", label: "评审中", next: ["processing", "pending"], actions: ["approve_review", "reject_review"] },
    { status: "processing", label: "处理中", next: ["delivering"], actions: ["start_delivery"] },
    { status: "delivering", label: "交付中", next: ["completed"], actions: ["complete"] },
    { status: "completed", label: "已完成", next: [], actions: ["verify"] },
  ],
};
