import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import { PreviewMode } from '../types';

interface PreviewContentProps {
  preview: string;
  previewMode: PreviewMode;
  graphPath: string;
}

export const PreviewContent: React.FC<PreviewContentProps> = ({
  preview,
  previewMode,
  graphPath,
}) => {
  if (previewMode === 'raw') {
    return (
      <pre className="p-4 whitespace-pre-wrap text-xs text-gray-300 font-mono leading-relaxed">
        {preview}
      </pre>
    );
  }

  return (
    <div
      className="w-full max-w-3xl mx-auto px-6 pt-8 pb-12 prose prose-sm prose-invert
      prose-headings:text-gray-100 prose-headings:font-normal prose-headings:tracking-tight
      prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-sm
      prose-strong:text-gray-100 prose-strong:font-semibold
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:transition-colors
      prose-code:text-blue-300 prose-code:bg-gray-800/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-800
      prose-img:rounded prose-img:shadow-lg prose-img:border prose-img:border-gray-800
      prose-li:text-sm prose-li:text-gray-300"
    >
      <ReactMarkdown
        remarkPlugins={[remarkFrontmatter]}
        components={{
          img: ({ src, alt, ...props }) => {
            let imageSrc = src;
            if (src && src.includes('assets/') && graphPath) {
              const match = src.match(/assets\/([^/]+)$/);
              if (match) {
                const fileName = match[1];
                imageSrc = `file://${graphPath}/assets/${fileName}`;
              }
            }
            return (
              <div className="my-6">
                <img
                  src={imageSrc}
                  alt={alt || 'Image'}
                  {...props}
                  className="w-full h-auto rounded shadow-lg border border-gray-800"
                />
              </div>
            );
          },
          h1: ({ ...props }) => (
            <h1
              {...props}
              className="text-2xl font-light mb-4 mt-6 text-gray-100 border-b border-gray-800 pb-2"
            />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-lg font-normal mb-3 mt-5 text-gray-100" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-base font-normal mb-2 mt-4 text-gray-200" />
          ),
          h4: ({ ...props }) => (
            <h4 {...props} className="text-sm font-medium mb-2 mt-3 text-gray-200" />
          ),
          h5: ({ ...props }) => (
            <h5 {...props} className="text-sm font-medium mb-1 mt-2 text-gray-300" />
          ),
          h6: ({ ...props }) => (
            <h6
              {...props}
              className="text-xs font-medium mb-1 mt-2 text-gray-300 uppercase tracking-wide"
            />
          ),
          p: ({ ...props }) => (
            <p {...props} className="mb-3 text-sm text-gray-300 leading-relaxed" />
          ),
          ul: ({ ...props }) => (
            <ul {...props} className="mb-3 ml-5 list-disc text-gray-300 space-y-1" />
          ),
          ol: ({ ...props }) => (
            <ol {...props} className="mb-3 ml-5 list-decimal text-gray-300 space-y-1" />
          ),
          li: ({ ...props }) => <li {...props} className="text-sm leading-relaxed" />,
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="border-l-3 border-blue-500/40 bg-blue-500/10 pl-3 pr-2 py-2 my-3 text-gray-300 italic text-sm"
            />
          ),
          hr: ({ ...props }) => <hr {...props} className="my-4 border-gray-700" />,
          code: ({ children, ...props }) => {
            const isInline = !String(children).includes('\n');
            return isInline ? (
              <code
                {...props}
                className="bg-gray-800/60 px-1 py-0.5 rounded text-xs font-mono text-blue-300"
              >
                {children}
              </code>
            ) : (
              <code
                {...props}
                className="block bg-gray-900/60 border border-gray-800 p-3 rounded overflow-x-auto font-mono text-xs text-gray-300 leading-5 my-3"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {preview}
      </ReactMarkdown>
    </div>
  );
};
