import { ArrowRight, Boxes, CircleHelp, Database, FolderKanban, HardDrive, Network, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, hasMenuAccess } from '@aiops/shared';
import { FillGuideDialog } from '../components/fill-guide-dialog';

const commonProducts = [
  {
    id: 'vm',
    title: '虚拟机申请',
    description: '服务器、部署环境、联调/验收/生产使用',
    icon: HardDrive,
    tone: 'emerald',
  },
  {
    id: 'container',
    title: '容器申请',
    description: '容器实例、运行环境、CPU/内存规格',
    icon: Boxes,
    tone: 'sky',
  },
  {
    id: 'obs',
    title: 'OBS 申请',
    description: '对象存储桶、目录、容量和访问密钥',
    icon: FolderKanban,
    tone: 'amber',
  },
  {
    id: 'sfs',
    title: 'SFS 申请',
    description: '文件共享存储、容量与使用周期',
    icon: Database,
    tone: 'violet',
  },
  {
    id: 'permission',
    title: '用户权限申请',
    description: '域账号、人员信息与权限集合开通',
    icon: ShieldCheck,
    tone: 'rose',
  },
  {
    id: 'network',
    title: '网络策略申请',
    description: '源目标地址、端口范围与互访策略',
    icon: Network,
    tone: 'slate',
  },
] as const;

function toneClasses(tone: string) {
  switch (tone) {
    case 'emerald':
      return {
        shell: 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70',
        icon: 'bg-emerald-100 text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700',
      };
    case 'sky':
      return {
        shell: 'border-sky-200 bg-sky-50/40 hover:bg-sky-50/70',
        icon: 'bg-sky-100 text-sky-700',
        badge: 'bg-sky-100 text-sky-700',
      };
    case 'amber':
      return {
        shell: 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70',
        icon: 'bg-amber-100 text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
      };
    case 'violet':
      return {
        shell: 'border-violet-200 bg-violet-50/40 hover:bg-violet-50/70',
        icon: 'bg-violet-100 text-violet-700',
        badge: 'bg-violet-100 text-violet-700',
      };
    case 'rose':
      return {
        shell: 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70',
        icon: 'bg-rose-100 text-rose-700',
        badge: 'bg-rose-100 text-rose-700',
      };
    default:
      return {
        shell: 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70',
        icon: 'bg-slate-200 text-slate-700',
        badge: 'bg-slate-200 text-slate-700',
      };
  }
}

export function CommonRequests() {
  const [guideOpen, setGuideOpen] = useState(false);
  const { currentUser } = useAuth();
  const canAccessCatalog = hasMenuAccess(currentUser, 'menu.portal.catalog');

  return (
    <div className="space-y-5">
      <FillGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">常见资源申请</h1>
          <p className="mt-2 text-sm text-slate-500">
            选择资源类型后进入填写。引导模式按步骤提示，适合不清楚怎么写；直接模式一次性展开全部表单，适合已明确申请内容。进入后仍可切换。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <CircleHelp className="h-4 w-4" />
          不知道如何填写？
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commonProducts.map(product => {
          const Icon = product.icon;
          const tone = toneClasses(product.tone);

          return (
            <section
              key={product.id}
              className={`group relative rounded-[20px] border p-5 transition-colors ${tone.shell}`}
            >
              <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
                高频套餐
              </span>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{product.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{product.description}</p>
              <Link
                to={`/guided-workbench?product=${product.id}`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                进入填写
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-sm text-slate-500">未覆盖你的场景？</p>
        {canAccessCatalog ? (
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
          >
            查看完整服务目录
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span
            className="inline-flex cursor-not-allowed items-center gap-1 text-sm font-medium text-slate-400"
            title="当前账号暂无完整服务目录访问权限"
          >
            查看完整服务目录
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
