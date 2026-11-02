import { ArrowRight, Box, Camera, Film, Mic, Monitor, Music2, Video } from 'lucide-react';
import './studio-hero.css';

interface Props { onOpenWorkspace: (id: string) => void; }
export function StudioHero({ onOpenWorkspace }: Props) {
  return <section className="oc-hero" aria-labelledby="studio-hero-title">
    <div className="oc-hero-main">
      <div className="oc-hero-copy">
        <p className="oc-kicker"><span /> A HOME FOR YOUR NEXT IDEA</p>
        <h1 id="studio-hero-title">Make room<br />to <em>create.</em></h1>
        <p className="oc-hero-description">A creative home for video, sound, images,<br className="oc-desktop-break" /> and ideas. Start with something that’s yours.</p>
        <div className="oc-hero-actions"><button className="oc-primary" onClick={() => onOpenWorkspace('riverstudio')}>Open the studio <ArrowRight size={17} /></button><a href="#studios-catalog" className="oc-text-link">Explore workspaces <ArrowRight size={16} /></a></div>
        <div className="oc-hero-footnote"><span className="oc-fine-line" /> Your tools. Your files. Your next beginning.</div>
      </div>
      <figure className="oc-workspace-preview">
        <div className="oc-preview-heading"><div><Video size={16} /><span>Recording studio</span></div><span className="oc-preview-mode">SCREEN + CAMERA</span></div>
        <div className="oc-preview-media">
          <div className="oc-preview-screen"><img src="/images/studio-lake.jpg" alt="Illustrative alpine lake example media" width="1672" height="941" fetchPriority="high" /><span><Monitor size={12} /> Screen</span></div>
          <div className="oc-preview-camera"><span className="oc-camera-label"><Camera size={12} /> Camera</span><div className="oc-camera-placeholder"><div className="oc-camera-aperture"><Camera size={31} strokeWidth={1.1} /></div><strong>A separate view.</strong><p>Your camera gets<br />its own video file.</p><button onClick={() => onOpenWorkspace('riverstudio')}>Set up camera <ArrowRight size={13} /></button></div></div>
        </div>
        <div className="oc-preview-track-area" aria-hidden="true">
          <div className="oc-preview-ruler"><span>Two views, kept separate</span><span>One recording session</span></div>
          <div className="oc-preview-track"><Monitor size={13} /><span>Screen</span><div className="oc-screen-strip">{Array.from({ length: 7 }, (_, i) => <img key={i} src="/images/studio-lake.jpg" alt="" />)}</div></div>
          <div className="oc-preview-track"><Mic size={13} /><span>Microphone</span><div className="oc-wave-strip">{Array.from({ length: 64 }, (_, i) => <i key={i} style={{ height: `${6 + Math.round(Math.abs(Math.sin(i * 1.2) * Math.cos(i * .37)) * 20)}px` }} />)}</div></div>
        </div>
        <figcaption><span>Illustrative workspace preview · example media</span><button onClick={() => onOpenWorkspace('riverstudio')}>Open recorder <ArrowRight size={12} /></button></figcaption>
      </figure>
    </div>
    <div className="oc-workflow-row" aria-label="Start a creative workflow">
      {[
        { title: 'Record', text: 'Screen, camera, and your voice.', id: 'riverstudio', Icon: Video },
        { title: 'Edit', text: 'Give your story its shape.', id: 'filmcraft', Icon: Film },
        { title: 'Compose', text: 'Bring your sounds together.', id: 'music', Icon: Music2 },
        { title: 'Build', text: 'Turn an idea into a part.', id: 'solidcraft', Icon: Box }
      ].map(({ title, text, id, Icon }, i) => <button key={id} onClick={() => onOpenWorkspace(id)}><span className="oc-workflow-number">0{i + 1}</span><Icon size={26} strokeWidth={1.25} /><div><strong>{title}</strong><span>{text}</span></div><ArrowRight size={15} className="oc-workflow-arrow" /></button>)}
    </div>
  </section>;
}
