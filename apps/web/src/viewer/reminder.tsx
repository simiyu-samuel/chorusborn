import { ArrowUpRight, BookOpen, MessageCircle } from 'lucide-react';
import { CopyText } from './copy-text.js';
import './viewer.css';

export function GuideShare() {
  const url = new URL('/guide', window.location.origin).href;
  return (
    <section className="viewer-share" aria-label="Share the viewer guide">
      <div>
        <BookOpen size={19} />
        <div>
          <h2>Give chat a way in.</h2>
          <p>
            <a href="/guide" target="_blank" rel="noreferrer">
              Open the viewer guide <ArrowUpRight size={12} />
            </a>{' '}
            · rules, teaching examples and lesson stages.
          </p>
        </div>
      </div>
      <CopyText text={url} label="Copy viewer guide link" />
      {['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) ? (
        <small>
          This is a local preview link. A hosted address is needed to share beyond this computer.
        </small>
      ) : null}
    </section>
  );
}
export function ViewerReminder() {
  return (
    <aside className="viewer-reminder" aria-label="How viewers participate">
      <div>
        <MessageCircle size={18} />
        <span>
          CHAT COACHES
          <br />
          <small>Core → your gate · first to 3 · 60s</small>
        </span>
      </div>
      <div>
        <code>!teach When carrying the core, return home cautiously.</code>
        <p>Post in your streamer’s Twitch chat · coach reviews → new round → credit when used</p>
      </div>
      <a href="/guide" target="_blank" rel="noreferrer">
        How to play <ArrowUpRight size={14} />
      </a>
    </aside>
  );
}
