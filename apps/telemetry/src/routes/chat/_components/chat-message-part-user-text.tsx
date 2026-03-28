export function ChatMessagePartUserText({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
  );
}
