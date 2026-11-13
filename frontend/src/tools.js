// One list of tools, used by the home page cards and the drop-zone chips.
// `local: true` = runs in the browser (pdfLocal.js); nothing is uploaded.
// `takes`: what the tool accepts — 'pdfs' (several), 'pdf' (one), 'images'.
export const TOOL_GROUPS = [
  {
    id: 'organize', title: 'Organize', tone: 'red',
    tools: [
      { id: 'merge', name: 'Merge PDF', short: 'Merge', desc: 'Combine files into one, in your order.', path: '/merge', icon: 'merge', local: true, takes: 'pdfs' },
      { id: 'split', name: 'Split PDF', short: 'Split', desc: 'Break into ranges or every N pages.', path: '/split', icon: 'split', local: true, takes: 'pdf' },
      { id: 'rotate', name: 'Rotate PDF', short: 'Rotate', desc: 'Turn all pages or just a few.', path: '/rotate', icon: 'rotate', local: true, takes: 'pdf' },
      { id: 'extract', name: 'Extract pages', short: 'Extract pages', desc: 'Keep only the pages you need.', path: '/extract', icon: 'extract', local: true, takes: 'pdf' },
      { id: 'delete-pages', name: 'Delete pages', short: 'Delete pages', desc: "Remove the pages you don't want.", path: '/delete-pages', icon: 'delete', local: true, takes: 'pdf' },
    ],
  },
  {
    id: 'convert', title: 'Convert', tone: 'blue',
    tools: [
      { id: 'images-to-pdf', name: 'Image to PDF', short: 'Image to PDF', desc: 'JPG, PNG and more. Phone photos come out upright.', path: '/images-to-pdf', icon: 'image', takes: 'images' },
    ],
  },
  {
    id: 'optimize', title: 'Optimize', tone: 'amber',
    tools: [
      { id: 'compress', name: 'Compress PDF', short: 'Compress', desc: 'Smaller files for email.', path: '/compress', icon: 'compress', takes: 'pdf' },
      { id: 'info', name: 'PDF info', short: 'PDF info', desc: 'Pages, title, author, metadata.', path: '/info', icon: 'info', takes: 'pdf' },
    ],
  },
  {
    id: 'security', title: 'Security', tone: 'green',
    tools: [
      { id: 'protect', name: 'Protect PDF', short: 'Protect', desc: 'Add a password.', path: '/protect', icon: 'lock', takes: 'pdf' },
      { id: 'unlock', name: 'Unlock PDF', short: 'Unlock', desc: 'Remove a password you know.', path: '/unlock', icon: 'unlock', takes: 'pdf' },
    ],
  },
];

export const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools.map((t) => ({ ...t, tone: g.tone })));
