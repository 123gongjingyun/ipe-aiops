import { useState, type ChangeEvent, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { ArtifactPanel, type UploadedArtifact } from './artifact-panel';

const runtimeBaseUrl = import.meta.env.BASE_URL;
const portalBase = runtimeBaseUrl && runtimeBaseUrl !== '/' ? runtimeBaseUrl : '/portal/';

export const ARCHITECTURE_TEMPLATE_LABEL = '架构图模版.xlsx';
export const ARCHITECTURE_TEMPLATE_PATH = `${portalBase.replace(/\/?$/, '/')}templates/${ARCHITECTURE_TEMPLATE_LABEL}`;

export function formatArtifactSizeLabel(file: File, fallback: string) {
  if (!Number.isFinite(file.size) || file.size <= 0) return fallback;
  if (file.size >= 1024 * 1024) return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  if (file.size >= 1024) return `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `${file.size} B`;
}

export function ArchitectureArtifactField({
  required = false,
  artifacts,
  description,
  emptyHint,
  onFileChange,
  onRemove,
  extraActions,
  hintText = '请直接基于平台提供的模板补充内容，保留模板里的参考元素，避免用户不知道如何填写。',
  inputId = 'architecture-file-upload',
  accept = '.png,.jpg,.jpeg,.pdf,.xlsx',
}: {
  required?: boolean;
  artifacts: UploadedArtifact[];
  description: string;
  emptyHint: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  extraActions?: ReactNode;
  hintText?: string;
  inputId?: string;
  accept?: string;
}) {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <ArtifactPanel
      title={(
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span>架构图材料{required ? '（必填）' : ''}</span>
            <button
              type="button"
              aria-label="查看架构图填写说明"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              onClick={() => setHintOpen(current => !current)}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
          {hintOpen ? (
            <div className="rounded-lg border border-cyan-100 bg-white/90 px-2.5 py-2 text-xs font-normal leading-5 text-slate-600">
              {hintText}
            </div>
          ) : null}
        </div>
      )}
      description={description}
      accent="primary"
      artifacts={artifacts}
      emptyHint={emptyHint}
      actions={(
        <>
          <a
            href={ARCHITECTURE_TEMPLATE_PATH}
            download={ARCHITECTURE_TEMPLATE_LABEL}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            下载模版
          </a>
          <label
            htmlFor={inputId}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-95"
          >
            上传架构图
          </label>
          <input
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={onFileChange}
          />
          {extraActions}
        </>
      )}
      onRemove={onRemove}
    />
  );
}
