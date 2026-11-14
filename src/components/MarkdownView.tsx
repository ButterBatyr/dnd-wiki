import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownView({ text }: { text: string }) {
  if (!text.trim()) return <p className="text-dust">Описания пока нет.</p>;
  return (
    <div className="prose prose-parchment max-w-none prose-headings:font-display prose-img:rounded-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
