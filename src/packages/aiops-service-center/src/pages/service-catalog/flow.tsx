import { ArrowRight, Boxes, FlaskConical, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  STANDARD_DELIVERY_PROCESS,
} from "@aiops/shared";
import type { ProcessPhase, ProcessStep } from "@aiops/shared";
import { PageHeader } from '../../components/page-header';

const LANES = [
  { key: "user" as const, label: "用户视角", sub: "应用担当", bg: "bg-blue-50/60" },
  { key: "delivery" as const, label: "交付视角", sub: "基础担当", bg: "bg-amber-50/60" },
  { key: "ai" as const, label: "AI 辅助", sub: "", bg: "bg-purple-50/60" },
];

function getSteps(phase: ProcessPhase, lane: "user" | "delivery" | "ai") {
  return lane === "user"
    ? phase.userSteps
    : lane === "delivery"
      ? phase.deliverySteps
      : phase.aiAssists;
}

function StepPill({ step }: { step: ProcessStep }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-0.5 text-xs shadow-sm cursor-default">
            {step.label}
            {step.aiAssisted && <Sparkles className="w-3 h-3 text-purple-500" />}
            {step.deliveryMode && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 leading-none h-4">
                {step.deliveryMode === "ai" ? "AI" : "人工"}
              </Badge>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {step.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ServiceFlow() {
  const navigate = useNavigate();
  const phases = STANDARD_DELIVERY_PROCESS;

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="服务流程"
          description="标准交付流程全览，统一展示用户视角、交付视角与 AI 辅助动作的协同关系。"
        />
      </div>

      {/* 泳道流程图 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            标准交付流程 v1.0
            <Badge variant="outline" className="text-xs font-normal">
              {phases.length} 阶段
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              {/* 阶段表头 */}
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[100px] min-w-[100px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    阶段
                  </th>
                  {phases.map((phase) => (
                    <th key={phase.id} className="px-3 py-2 text-center min-w-[180px]">
                      <div className="text-sm font-semibold">{phase.title}</div>
                      <Badge variant="secondary" className="text-[10px] mt-0.5 font-mono">
                        {phase.orderStatus}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              {/* 三轨泳道 */}
              <tbody>
                {LANES.map((lane) => (
                  <tr key={lane.key} className="border-b last:border-b-0">
                    <td className={`px-3 py-3 ${lane.bg} border-r`}>
                      <div className="text-xs font-semibold">{lane.label}</div>
                      {lane.sub && (
                        <div className="text-[10px] text-muted-foreground">{lane.sub}</div>
                      )}
                    </td>
                    {phases.map((phase) => {
                      const steps = getSteps(phase, lane.key);
                      return (
                        <td key={phase.id} className={`px-3 py-3 ${lane.bg}`}>
                          {steps.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {steps.map((step) => (
                                <StepPill key={step.id} step={step} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 状态映射表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">状态映射</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            阶段与 OrderStatus 的对应关系及流转条件
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>阶段</TableHead>
                <TableHead>OrderStatus</TableHead>
                <TableHead>用户核心动作</TableHead>
                <TableHead>交付核心动作</TableHead>
                <TableHead>触发流转条件</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell className="font-medium">{phase.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {phase.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {phase.userSteps[0]?.label ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {phase.deliverySteps[0]?.label ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {phase.transitionCondition}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-slate-700" />
              原子服务输入 / 输出
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              评审通过后进入方案编排，编排的基础就是各原子服务的 inputSchema / outputSchema。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>输入用于标准化申请字段、评审补充项和 AI 编排参数。</p>
            <p>输出用于交付回填、资产沉淀、验收报告和后续运维接管。</p>
            <button
              onClick={() => navigate('/service-catalog')}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              去服务目录查看 Schema <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">阶段输入 / 输出建议</CardTitle>
            <p className="text-sm text-muted-foreground">
              先按阶段固定字段，再逐步把跨页面字段回收到设置中的字段字典。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-foreground">评审阶段</div>
              <div className="text-muted-foreground">输入：用途、时长、风险说明、资源规模；输出：评审结论、意见、套餐建议，以及生产态下来自 ITSM 的审批结果。</div>
            </div>
            <div>
              <div className="font-medium text-foreground">方案编排阶段</div>
              <div className="text-muted-foreground">输入：标准字段 + 评审结论；输出：资源清单、交付步骤、集成项、费用概览。</div>
            </div>
            <div>
              <div className="font-medium text-foreground">交付与注册阶段</div>
              <div className="text-muted-foreground">输入：交付执行结果；输出：资产台账、验收记录、知识沉淀、运行接管信息。</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-slate-700" />
              仿真环境对接占位
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              先把对接点明确到流程里，后续再接真实仿真平台或测试沙箱。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>建议接在方案编排与正式交付之间：编排完成后先做预检、连通性验证、配置回放，再放行到正式交付。</p>
            <p>最小对接内容：环境标识、原子服务输入快照、预期输出、校验结果、失败回退原因。</p>
            <p>页面先作为流程挂点展示，后续可演进成单独工作台或执行记录页。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
