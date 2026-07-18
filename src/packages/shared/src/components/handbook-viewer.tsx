import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HandbookViewerProps {
  content: string;
}

export function HandbookViewer({ content }: HandbookViewerProps) {
  return (
    <article className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground prose-pre:bg-muted/50 prose-th:text-foreground prose-td:text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
