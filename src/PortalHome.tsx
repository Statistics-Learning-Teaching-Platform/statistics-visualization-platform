const destinations = [
  {
    href: "/teaching#confidence-interval",
    eyebrow: "STATISTICAL FOUNDATIONS",
    title: "统计教学平台",
    description: "进入统计原理、统计模拟与交互式可视化课程。",
    icon: "∫",
  },
  {
    href: "/st-qselector",
    eyebrow: "QUESTION BANK",
    title: "统计学组卷",
    description: "按章节、题型、难度与知识点筛选题目并生成试卷。",
    icon: "Q",
  },
];

export function PortalHome() {
  return (
    <main className="portal-home">
      <section className="portal-hero" aria-labelledby="portal-title">
        <div className="portal-brand-mark" aria-hidden="true">
          <span className="portal-bulb">∩</span>
          <span className="portal-bars"><i /><i /><i /><i /></span>
        </div>
        <p className="portal-kicker">STATMIND · 统计思维</p>
        <h1 id="portal-title">选择你要进入的模块</h1>
        <p className="portal-lead">学习、探索、组卷，在同一个平台完成。</p>

        <div className="portal-destinations">
          {destinations.map((destination) => (
            <a key={destination.href} className="portal-card" href={destination.href}>
              <span className="portal-card__icon" aria-hidden="true">{destination.icon}</span>
              <span className="portal-card__copy">
                <span className="portal-card__eyebrow">{destination.eyebrow}</span>
                <strong>{destination.title}</strong>
                <span>{destination.description}</span>
              </span>
              <span className="portal-card__arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
