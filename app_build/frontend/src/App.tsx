import { useEffect, useMemo, useState } from "react";

type Page =
  | "login" | "signup" | "events" | "event" | "seats" | "reservation" | "checkout"
  | "processing" | "success" | "ticket" | "tickets" | "orders" | "order"
  | "organizer" | "organizer-events" | "create-event" | "manage-seats" | "sales"
  | "operator" | "admin" | "admin-users" | "audit" | "navigation" | "states";

type IconName = "search" | "bell" | "user" | "calendar" | "pin" | "clock" | "ticket" |
  "arrow" | "check" | "chevron" | "grid" | "orders" | "chart" | "users" | "shield" |
  "plus" | "edit" | "download" | "logout" | "menu" | "x" | "card";

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  ticket: <><path d="M3 8a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V4H3Z"/><path d="M13 7h4M13 11h4M13 15h4M9 4v14"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  orders: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 6"/></>,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  edit: <><path d="m4 20 4-1 11-11-3-3L5 16Z"/><path d="m14 7 3 3"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/></>,
  logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></>,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ onClick }: { onClick?: () => void }) {
  return <button className="logo" onClick={onClick} aria-label="PulsePass, página inicial"><span className="logo-mark">P</span><span>PulsePass</span></button>;
}

function Button({ children, onClick, variant = "primary", icon, disabled = false, className = "", type = "button" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  icon?: IconName; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`}>{icon && <Icon name={icon}/>}<span>{children}</span></button>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" | "purple" }) {
  return <span className={`badge badge-${tone}`}><span className="badge-dot"/>{children}</span>;
}

function Field({ label, placeholder, type = "text", defaultValue }: { label: string; placeholder?: string; type?: string; defaultValue?: string }) {
  return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} defaultValue={defaultValue}/></label>;
}

function Select({ label, children }: { label?: string; children: React.ReactNode }) {
  return <label className="field">{label && <span>{label}</span>}<select>{children}</select></label>;
}

function Search({ placeholder = "Buscar eventos, artistas ou cidades..." }: { placeholder?: string }) {
  return <label className="search"><Icon name="search"/><input placeholder={placeholder}/></label>;
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="page-title"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function Header({ go, notifications, setNotifications }: { go: (p: Page) => void; notifications: boolean; setNotifications: (v: boolean) => void }) {
  const [mobile, setMobile] = useState(false);
  return <header className="topbar">
    <div className="header-inner">
      <Logo onClick={() => go("events")}/>
      <nav className={mobile ? "nav open" : "nav"}>
        <button onClick={() => {go("events"); setMobile(false)}}>Eventos</button>
        <button onClick={() => {go("orders"); setMobile(false)}}>Meus pedidos</button>
        <button onClick={() => {go("tickets"); setMobile(false)}}>Meus ingressos</button>
      </nav>
      <div className="header-search"><Search placeholder="Buscar eventos..."/></div>
      <div className="header-actions">
        <div className="notification-wrap">
          <button className="icon-btn" onClick={() => setNotifications(!notifications)} aria-label="Notificações"><Icon name="bell"/><span className="alert-dot"/></button>
          {notifications && <NotificationMenu/>}
        </div>
        <button className="avatar-btn" onClick={() => go("organizer")}><span className="avatar">ML</span><span className="avatar-name">Marina Lima</span><Icon name="chevron" size={14}/></button>
        <button className="icon-btn mobile-menu" onClick={() => setMobile(!mobile)}><Icon name={mobile ? "x" : "menu"}/></button>
      </div>
    </div>
  </header>;
}

function NotificationMenu() {
  return <div className="notification-menu">
    <div className="menu-head"><strong>Notificações</strong><button>Marcar como lidas</button></div>
    {[
      ["Pagamento confirmado", "Seu pedido #PP-10482 foi aprovado.", "Agora"],
      ["Ingresso emitido", "Rock Festival já está disponível.", "2 min"],
      ["Sua reserva expira em breve", "Finalize a compra nos próximos minutos.", "5 min"],
    ].map((n, i) => <div className="notification" key={n[0]}><span className={`notification-icon n${i}`}><Icon name={i === 0 ? "check" : i === 1 ? "ticket" : "clock"}/></span><div><strong>{n[0]}</strong><p>{n[1]}</p><small>{n[2]}</small></div></div>)}
  </div>;
}

function Footer({ go }: { go: (p: Page) => void }) {
  return <footer><div className="footer-inner"><Logo onClick={() => go("events")}/><p>Bilhetagem segura para experiências inesquecíveis.</p><div><button onClick={() => go("states")}>Estados do sistema</button><button onClick={() => go("navigation")}>Navigation Map</button><button onClick={() => go("organizer")}>Área do organizador</button><button onClick={() => go("operator")}>Operação</button><button onClick={() => go("admin")}>Admin</button></div></div></footer>;
}

const eventImages = [
  "https://images.unsplash.com/photo-1626125345510-4603468eedfb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1582192903020-8a5e59dcdcf2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1790172068736-a70dfbfa4f7e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1763962274119-1a0a0d418520?auto=format&fit=crop&w=900&q=80",
];

const events = [
  { name: "Rock Festival Porto Alegre", date: "21 NOV", time: "18:00", place: "Arena Pulse", city: "Porto Alegre, RS", price: "R$ 120", category: "Música", image: eventImages[0], hot: true },
  { name: "Tech Conference 2026", date: "05 DEZ", time: "09:00", place: "Centro de Eventos", city: "São Paulo, SP", price: "R$ 180", category: "Tecnologia", image: eventImages[1] },
  { name: "Festival de Verão", date: "17 JAN", time: "16:00", place: "Parque de Eventos", city: "Florianópolis, SC", price: "R$ 95", category: "Festival", image: eventImages[2], hot: true },
  { name: "Horizonte — Música & Arte", date: "14 FEV", time: "17:30", place: "Pavilhão Aurora", city: "Curitiba, PR", price: "R$ 140", category: "Cultura", image: eventImages[3] },
  { name: "Summit Criativo 2027", date: "12 MAR", time: "10:00", place: "Hub Central", city: "Belo Horizonte, MG", price: "R$ 160", category: "Negócios", image: eventImages[1] },
  { name: "Noite Sinfônica", date: "28 MAR", time: "20:30", place: "Teatro Metropolitano", city: "Rio de Janeiro, RJ", price: "R$ 110", category: "Música", image: eventImages[3] },
];

function EventCard({ event, onClick }: { event: typeof events[0]; onClick: () => void }) {
  return <article className="event-card">
    <div className="event-image"><img src={event.image} alt={`Público no evento ${event.name}`}/>{event.hot && <span className="image-badge">Últimos ingressos</span>}</div>
    <div className="event-content">
      <div className="event-date"><strong>{event.date.split(" ")[0]}</strong><span>{event.date.split(" ")[1]}</span></div>
      <div className="event-info"><span className="category">{event.category}</span><h2>{event.name}</h2><p><Icon name="clock" size={15}/>{event.time}</p><p><Icon name="pin" size={15}/>{event.place} · {event.city}</p><div className="event-bottom"><span>A partir de <strong>{event.price}</strong></span><Button variant="outline" onClick={onClick}>Ver evento</Button></div></div>
    </div>
  </article>;
}

function EventsPage({ go }: { go: (p: Page) => void }) {
  return <main>
    <section className="hero">
      <div className="hero-content"><Badge tone="purple">Agenda 2026/2027</Badge><h1>Viva o evento.<br/>A gente cuida do acesso.</h1><p>Descubra grandes experiências e garanta seu lugar com segurança, transparência e praticidade.</p><Search/><div className="quick-search"><span>Em alta:</span><button>Festivais</button><button>Tecnologia</button><button>São Paulo</button></div></div>
      <div className="hero-visual"><img src={eventImages[0]} alt="Festival com palco iluminado"/><div className="floating-ticket"><span className="ft-icon"><Icon name="ticket"/></span><div><small>Próximo evento</small><strong>Rock Festival</strong><span>21 nov · Arena Pulse</span></div></div></div>
    </section>
    <section className="content-section">
      <PageTitle title="Encontre seu próximo evento" subtitle="Experiências selecionadas para todos os estilos." action={<div className="view-toggle"><button className="active"><Icon name="grid"/></button><button><Icon name="menu"/></button></div>}/>
      <div className="filters"><Select><option>Qualquer data</option><option>Este mês</option></Select><Select><option>Todos os locais</option><option>São Paulo</option></Select><Select><option>Todas as categorias</option><option>Música</option></Select><span className="filter-spacer"/><Select><option>Mais relevantes</option><option>Menor preço</option></Select></div>
      <div className="event-grid">{events.map(e => <EventCard key={e.name} event={e} onClick={() => go("event")}/>)}</div>
      <div className="pagination"><button className="active">1</button><button>2</button><button>3</button><button><Icon name="chevron"/></button></div>
    </section>
  </main>;
}

function EventDetails({ go }: { go: (p: Page) => void }) {
  return <main className="content-section detail-page">
    <div className="breadcrumbs"><button onClick={() => go("events")}>Eventos</button><Icon name="chevron" size={14}/><span>Rock Festival Porto Alegre</span></div>
    <div className="event-banner"><img src={eventImages[0]} alt="Rock Festival Porto Alegre"/><div className="banner-overlay"><Badge tone="success">Vendas abertas</Badge><h1>Rock Festival<br/>Porto Alegre</h1></div></div>
    <div className="detail-layout">
      <div className="detail-main">
        <div className="detail-facts"><div><Icon name="calendar"/><span><small>Data e horário</small><strong>21 de novembro de 2026</strong><p>Sábado, às 18:00</p></span></div><div><Icon name="pin"/><span><small>Local</small><strong>Arena Pulse</strong><p>Av. das Experiências, 1200 · Porto Alegre, RS</p></span></div></div>
        <hr/><h2>Sobre o evento</h2><p>Uma noite de grandes encontros, som marcante e experiências imersivas. O Rock Festival reúne artistas nacionais em uma estrutura preparada para receber milhares de pessoas com conforto e segurança.</p>
        <div className="organizer-row"><span className="avatar org">AP</span><div><small>Organizado por</small><strong>Aurora Produções</strong><p>Organizador verificado</p></div><Button variant="ghost">Ver perfil</Button></div>
      </div>
      <aside className="ticket-options"><h2>Escolha seu ingresso</h2><p>Selecione um setor para continuar</p>
        {[["Pista", "R$ 120,00", "Disponível", "success"], ["Pista Premium", "R$ 200,00", "Poucos ingressos", "warning"], ["Camarote", "R$ 350,00", "Esgotado", "neutral"]].map((t, i) =>
          <button className={`ticket-option ${i === 1 ? "selected" : ""} ${i === 2 ? "disabled" : ""}`} key={t[0]}><span className="radio"/><span><strong>{t[0]}</strong><small>2º lote</small></span><span><strong>{t[1]}</strong><Badge tone={t[3] as "success"}>{t[2]}</Badge></span></button>)}
        <Button className="full" onClick={() => go("seats")}>Escolher assentos <Icon name="arrow"/></Button><small className="secure-note"><Icon name="shield" size={15}/> Compra segura e reserva por 10 minutos</small>
      </aside>
    </div>
  </main>;
}

type SeatState = "available" | "selected" | "reserved" | "sold" | "blocked";
function Seat({ state, label, onClick }: { state: SeatState; label: string; onClick?: () => void }) {
  return <button title={`${label} — ${state}`} onClick={onClick} className={`seat ${state}`}>{label}</button>;
}

function SeatMap({ admin = false, onSelect, selected = "B14" }: { admin?: boolean; onSelect?: (seat: string, state: SeatState) => void; selected?: string }) {
  const rows = ["A", "B", "C", "D", "E", "F"];
  return <div className="seat-map">
    <div className="stage"><span>PALCO</span></div>
    <div className="sector-title">PISTA PREMIUM</div>
    <div className="seat-rows">{rows.map((r, ri) => <div className="seat-row" key={r}><span>{r}</span>{Array.from({length: 16}, (_, i) => {
      const label = `${r}${i + 1}`;
      let state: SeatState = (ri + i) % 11 === 0 ? "sold" : (ri * i) % 13 === 4 ? "reserved" : (ri + i) % 17 === 3 ? "blocked" : "available";
      if (label === selected) state = "selected";
      return <Seat key={label} label={String(i + 1)} state={state} onClick={() => onSelect?.(label, state)}/>;
    })}<span>{r}</span></div>)}</div>
    <div className="seat-legend">{[["available","Disponível"],["selected","Selecionado"],["reserved","Reservado"],["sold","Vendido"],["blocked",admin ? "Bloqueado" : "Indisponível"]].map(x => <span key={x[0]}><i className={x[0]}/>{x[1]}</span>)}</div>
  </div>;
}

function SeatsPage({ go }: { go: (p: Page) => void }) {
  const [selected, setSelected] = useState("B14");
  const [toast, setToast] = useState(false);
  const choose = (seat: string, state: SeatState) => {
    if (state === "reserved" || state === "sold" || state === "blocked") { setToast(true); setTimeout(() => setToast(false), 3200); return; }
    setSelected(seat);
  };
  return <main className="content-section seat-page">
    <div className="breadcrumbs"><button onClick={() => go("event")}>Rock Festival Porto Alegre</button><Icon name="chevron" size={14}/><span>Escolher assentos</span></div>
    <PageTitle title="Escolha seus assentos" subtitle="Clique em um assento disponível para selecioná-lo."/>
    <div className="seat-layout"><div className="map-card"><div className="map-toolbar"><div><strong>Setor: Pista Premium</strong><span>Fileiras A–F</span></div><div className="zoom"><button>−</button><span>100%</span><button>+</button></div></div><SeatMap selected={selected} onSelect={choose}/></div>
      <aside className="selection-summary"><span className="summary-icon"><Icon name="ticket"/></span><h2>Seu assento</h2><p>Rock Festival Porto Alegre</p><div className="summary-lines"><div><span>Setor</span><strong>Pista Premium</strong></div><div><span>Fileira</span><strong>{selected[0]}</strong></div><div><span>Assento</span><strong>{selected.slice(1)}</strong></div><div className="price"><span>Preço</span><strong>R$ 200,00</strong></div></div><Button className="full" onClick={() => go("reservation")}>Reservar assento</Button><small>A reserva será válida por 10 minutos.</small></aside>
    </div>
    {toast && <div className="toast error"><span><Icon name="x"/></span><div><strong>Assento indisponível</strong><p>Este assento não está mais disponível.</p></div><button onClick={() => setToast(false)}><Icon name="x"/></button></div>}
  </main>;
}

function Countdown({ compact = false }: { compact?: boolean }) {
  const [seconds, setSeconds] = useState(582);
  useEffect(() => { const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, []);
  const value = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className={compact ? "countdown compact" : "countdown"}><span className="clock-icon"><Icon name="clock"/></span><div><small>{compact ? "Reserva expira em" : "Tempo restante da reserva"}</small><strong>{value}</strong>{!compact && <span>restantes</span>}</div></div>;
}

function OrderSummary() {
  return <div className="order-summary"><div className="mini-event"><img src={eventImages[0]} alt="Rock Festival"/><div><strong>Rock Festival Porto Alegre</strong><span>21 nov 2026 · 18:00</span><span>Arena Pulse</span></div></div><div className="summary-lines"><div><span>Setor</span><strong>Pista Premium</strong></div><div><span>Fileira / Assento</span><strong>B / 14</strong></div><hr/><div><span>Ingresso</span><strong>R$ 200,00</strong></div><div><span>Taxa de serviço</span><strong>R$ 20,00</strong></div><div className="total"><span>Total</span><strong>R$ 220,00</strong></div></div></div>;
}

function Reservation({ go }: { go: (p: Page) => void }) {
  const [expired, setExpired] = useState(false);
  return <main className="narrow-page"><div className="success-heading"><span className="success-icon"><Icon name="check"/></span><Badge tone="success">Reserva ativa</Badge><h1>Assento reservado temporariamente</h1><p>Seu lugar está garantido enquanto você finaliza a compra.</p></div><Countdown/>
    <div className="reservation-card"><OrderSummary/><div className="reservation-actions"><Button className="full" onClick={() => go("checkout")}>Continuar para o checkout <Icon name="arrow"/></Button><Button className="full" variant="ghost" onClick={() => setExpired(true)}>Cancelar reserva</Button><small><Icon name="shield"/> Seus dados estão protegidos.</small></div></div>
    {expired && <Modal title="Reserva expirada" text="O tempo da sua reserva terminou e o assento foi liberado." action="Escolher outro assento" onAction={() => go("seats")} onClose={() => setExpired(false)}/>}
  </main>;
}

function Modal({ title, text, action, onAction, onClose }: { title: string; text: string; action: string; onAction: () => void; onClose: () => void }) {
  return <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={onClose}><Icon name="x"/></button><span className="modal-icon"><Icon name="clock"/></span><h2>{title}</h2><p>{text}</p><Button className="full" onClick={onAction}>{action}</Button></div></div>;
}

function Checkout({ go }: { go: (p: Page) => void }) {
  const [method, setMethod] = useState("card");
  return <main className="content-section checkout-page"><div className="checkout-head"><div><div className="breadcrumbs"><button onClick={() => go("reservation")}>Reserva</button><Icon name="chevron" size={14}/><span>Checkout</span></div><h1>Finalize sua compra</h1></div><Countdown compact/></div>
    <div className="checkout-layout"><div className="checkout-form">
      <section className="form-card"><div className="number-title"><span>1</span><div><h2>Dados do comprador</h2><p>Usaremos estes dados para emitir seu ingresso.</p></div></div><div className="form-grid"><Field label="Nome completo" defaultValue="Marina Lima"/><Field label="E-mail" defaultValue="marina@email.com"/><Field label="CPF" placeholder="000.000.000-00"/></div></section>
      <section className="form-card"><div className="number-title"><span>2</span><div><h2>Pagamento</h2><p>Escolha como deseja pagar.</p></div></div><div className="payment-tabs"><button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}><Icon name="card"/> Cartão</button><button className={method === "pix" ? "active" : ""} onClick={() => setMethod("pix")}><span className="pix-shape"/> PIX</button></div>
        {method === "card" ? <div className="form-grid"><div className="wide"><Field label="Número do cartão" placeholder="0000 0000 0000 0000"/></div><Field label="Nome impresso no cartão" placeholder="Como aparece no cartão"/><div className="two-fields"><Field label="Validade" placeholder="MM/AA"/><Field label="CVV" placeholder="000"/></div></div> : <div className="pix-box"><span className="pix-shape large"/><div><strong>Pagamento instantâneo via PIX</strong><p>O código será gerado após confirmar o pedido.</p></div></div>}
      </section>
    </div><aside className="checkout-summary"><h2>Resumo do pedido</h2><OrderSummary/><Button className="full" onClick={() => go("processing")}>Finalizar pagamento</Button><small><Icon name="shield"/> Ambiente seguro e criptografado</small></aside></div>
  </main>;
}

function Processing({ go }: { go: (p: Page) => void }) {
  useEffect(() => { const id = setTimeout(() => go("success"), 2200); return () => clearTimeout(id); }, [go]);
  return <main className="state-page"><div className="spinner"/><h1>Estamos processando seu pagamento</h1><p>Isso pode levar alguns segundos. Não feche esta página.</p><div className="processing-steps"><span className="done"><Icon name="check"/> Dados enviados</span><i/><span className="active"><span className="mini-spinner"/> Validando pagamento</span><i/><span><Icon name="ticket"/> Emitindo ingresso</span></div></main>;
}

function Success({ go }: { go: (p: Page) => void }) {
  return <main className="state-page success-page"><div className="success-ring"><Icon name="check" size={42}/></div><Badge tone="success">Compra concluída</Badge><h1>Pagamento confirmado!</h1><p>Seu ingresso já está disponível. Enviamos a confirmação para <strong>marina@email.com</strong>.</p><div className="confirmation-card"><div className="order-number"><span>Pedido</span><strong>#PP-10482</strong></div><div className="mini-event"><img src={eventImages[0]} alt="Rock Festival"/><div><strong>Rock Festival Porto Alegre</strong><span>21 de novembro de 2026 · 18:00</span><span>Arena Pulse · Pista Premium · B14</span></div></div><div className="paid"><span>Valor pago</span><strong>R$ 220,00</strong></div></div><div className="button-row"><Button onClick={() => go("ticket")} icon="ticket">Ver ingresso</Button><Button variant="outline" onClick={() => go("orders")}>Ver meus pedidos</Button></div></main>;
}

function FakeQR() {
  const cells = useMemo(() => Array.from({length: 121}, (_, i) => ((i * 7 + Math.floor(i / 11) * 3) % 5 < 2)), []);
  return <div className="qr">{cells.map((on, i) => <i className={on ? "on" : ""} key={i}/>)}</div>;
}

function TicketPage({ go }: { go: (p: Page) => void }) {
  return <main className="ticket-page"><div className="breadcrumbs"><button onClick={() => go("tickets")}>Meus ingressos</button><Icon name="chevron" size={14}/><span>Ingresso #TKT-8745</span></div><PageTitle title="Seu ingresso" subtitle="Apresente o QR Code na entrada do evento."/>
    <div className="digital-ticket"><div className="ticket-top"><img src={eventImages[0]} alt="Rock Festival"/><div className="ticket-overlay"><Logo/><Badge tone="success">Válido</Badge><h2>Rock Festival<br/>Porto Alegre</h2><span>21 NOV 2026 · 18:00</span></div></div><div className="ticket-body"><div className="ticket-details"><div><span>LOCAL</span><strong>Arena Pulse</strong><p>Porto Alegre, RS</p></div><div><span>SETOR</span><strong>Pista Premium</strong></div><div><span>FILEIRA</span><strong>B</strong></div><div><span>ASSENTO</span><strong>14</strong></div><div><span>TITULAR</span><strong>Marina Lima</strong></div><div><span>CÓDIGO DO INGRESSO</span><strong>TKT-8745-PP</strong></div></div><div className="qr-area"><FakeQR/><strong>TKT-8745-PP</strong><span>Emitido em 21/11/2026 às 10:42</span></div></div></div>
    <div className="button-row center"><Button icon="download">Baixar PDF</Button><Button variant="outline" onClick={() => go("tickets")}>Voltar aos meus ingressos</Button></div><p className="ticket-note"><Icon name="shield"/> Este ingresso é pessoal. Não compartilhe seu QR Code.</p>
  </main>;
}

function Tickets({ go }: { go: (p: Page) => void }) {
  return <main className="content-section"><PageTitle eyebrow="Sua agenda" title="Meus ingressos" subtitle="Acesse seus ingressos emitidos e eventos anteriores."/><div className="tabs"><button className="active">Próximos eventos <span>2</span></button><button>Eventos passados</button></div><div className="ticket-list">
    {[events[0], events[2]].map((e, i) => <article className="ticket-card" key={e.name}><img src={e.image} alt={e.name}/><div className="ticket-date"><strong>{e.date.split(" ")[0]}</strong><span>{e.date.split(" ")[1]} 2026</span></div><div className="ticket-card-info"><Badge tone="success">Válido</Badge><h2>{e.name}</h2><p><Icon name="pin"/>{e.place} · {e.city}</p><span>Setor {i ? "Pista" : "Pista Premium"} · Fileira {i ? "C" : "B"} · Assento {i ? "08" : "14"}</span></div><Button variant="outline" onClick={() => go("ticket")}>Ver ingresso</Button></article>)}
  </div></main>;
}

const orders = [
  ["#PP-10482", "Rock Festival Porto Alegre", "20/11/2026", "R$ 220,00", "Pago", "success"],
  ["#PP-10391", "Tech Conference 2026", "18/11/2026", "R$ 198,00", "Aguardando pagamento", "warning"],
  ["#PP-10274", "Festival de Verão", "12/11/2026", "R$ 114,00", "Reservado", "info"],
  ["#PP-09931", "Horizonte — Música & Arte", "02/10/2026", "R$ 165,00", "Expirado", "danger"],
];
function Orders({ go }: { go: (p: Page) => void }) {
  return <main className="content-section"><PageTitle eyebrow="Histórico" title="Meus pedidos" subtitle="Acompanhe compras, reservas e pagamentos."/><div className="table-tools"><Search placeholder="Buscar por evento ou pedido..."/><Select><option>Todos os status</option></Select></div><div className="data-table"><div className="table-row head"><span>Pedido</span><span>Evento</span><span>Data da compra</span><span>Valor</span><span>Status</span><span/></div>{orders.map(o => <div className="table-row" key={o[0]}><strong>{o[0]}</strong><span>{o[1]}</span><span>{o[2]}</span><strong>{o[3]}</strong><Badge tone={o[5] as "success"}>{o[4]}</Badge><button onClick={() => go("order")}>Ver detalhes <Icon name="chevron"/></button></div>)}</div></main>;
}

function OrderDetail({ go }: { go: (p: Page) => void }) {
  const steps = ["Pedido criado", "Assento reservado", "Pagamento iniciado", "Pagamento confirmado", "Ingresso emitido"];
  return <main className="content-section narrow-content"><div className="breadcrumbs"><button onClick={() => go("orders")}>Meus pedidos</button><Icon name="chevron" size={14}/><span>#PP-10482</span></div><PageTitle title="Detalhes do pedido" subtitle="Pedido #PP-10482" action={<Badge tone="success">Pago</Badge>}/><div className="order-detail-grid"><div className="panel"><h2>Acompanhamento</h2><div className="timeline">{steps.map((s, i) => <div className="timeline-step" key={s}><span><Icon name="check"/></span><div><strong>{s}</strong><small>{i === 0 ? "20/11/2026 às 10:32" : `20/11/2026 às 10:${34 + i * 2}`}</small></div></div>)}</div></div><div><div className="panel"><h2>Resumo</h2><OrderSummary/></div><Button className="full" onClick={() => go("ticket")}>Ver ingresso</Button></div></div></main>;
}

function AuthPage({ signup = false, go }: { signup?: boolean; go: (p: Page) => void }) {
  return <main className="auth-page"><div className="auth-brand"><Logo onClick={() => go("events")}/><div><Badge tone="purple">Eventos que pulsam</Badge><h1>Seu acesso a grandes experiências começa aqui.</h1><p>Descubra, reserve e viva momentos inesquecíveis com tranquilidade.</p></div><small>PulsePass · Protótipo acadêmico</small></div><div className="auth-panel"><div className="auth-box"><Logo onClick={() => go("events")}/><h1>{signup ? "Crie sua conta" : "Entre na sua conta"}</h1><p>{signup ? "Preencha seus dados para começar." : "Acesse seus ingressos, reservas e pedidos."}</p>{signup && <Field label="Nome completo" placeholder="Seu nome"/>}<Field label="E-mail" type="email" placeholder="voce@email.com"/><Field label="Senha" type="password" placeholder="Mínimo de 8 caracteres"/>{signup && <Field label="Confirmar senha" type="password" placeholder="Digite novamente"/>}{signup ? <label className="check-field"><input type="checkbox"/>Li e aceito os <button>termos de uso</button></label> : <div className="forgot"><label className="check-field"><input type="checkbox"/>Lembrar de mim</label><button>Esqueci minha senha</button></div>}<Button className="full" onClick={() => go("events")}>{signup ? "Criar conta" : "Entrar"}</Button><div className="auth-switch">{signup ? "Já possui uma conta?" : "Ainda não possui uma conta?"}<button onClick={() => go(signup ? "login" : "signup")}>{signup ? "Entrar" : "Cadastre-se"}</button></div></div></div></main>;
}

const organizerNav: [IconName, string, Page][] = [["grid","Dashboard","organizer"],["calendar","Eventos","organizer-events"],["plus","Criar evento","create-event"],["chart","Vendas","sales"],["orders","Relatórios","sales"]];
const operatorNav: [IconName, string, Page][] = [["grid","Dashboard","operator"],["calendar","Eventos","operator"],["orders","Pedidos","operator"],["ticket","Ingressos","operator"]];
const adminNav: [IconName, string, Page][] = [["grid","Dashboard","admin"],["users","Usuários","admin-users"],["user","Organizadores","admin-users"],["calendar","Eventos","admin"],["shield","Auditoria","audit"]];

function Sidebar({ role, page, go, mobileOpen, setMobileOpen }: { role: "organizer" | "operator" | "admin"; page: Page; go: (p: Page) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const items = role === "organizer" ? organizerNav : role === "operator" ? operatorNav : adminNav;
  return <aside className={`sidebar ${mobileOpen ? "open" : ""}`}><Logo onClick={() => go("events")}/><div className="workspace-label">{role === "organizer" ? "ORGANIZADOR" : role === "operator" ? "OPERAÇÃO" : "ADMINISTRAÇÃO"}</div><nav>{items.map(i => <button className={page === i[2] ? "active" : ""} key={i[1]} onClick={() => {go(i[2]); setMobileOpen(false)}}><Icon name={i[0]}/>{i[1]}</button>)}</nav><div className="sidebar-bottom"><button onClick={() => go("events")}><Icon name="arrow"/>Ir para área pública</button><button onClick={() => go("login")}><Icon name="logout"/>Sair</button><div className="side-user"><span className="avatar">{role === "admin" ? "LC" : role === "operator" ? "RS" : "AP"}</span><div><strong>{role === "admin" ? "Lucas Costa" : role === "operator" ? "Rafael Souza" : "Aurora Produções"}</strong><span>{role === "admin" ? "Administrador" : role === "operator" ? "Operador" : "Conta verificada"}</span></div></div></div></aside>;
}

function DashboardShell({ role, page, go, children }: { role: "organizer" | "operator" | "admin"; page: Page; go: (p: Page) => void; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="dashboard-shell"><Sidebar role={role} page={page} go={go} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/><div className="dashboard-main"><header className="dash-header"><button className="icon-btn dash-menu" onClick={() => setMobileOpen(true)}><Icon name="menu"/></button><div><strong>{role === "organizer" ? "Aurora Produções" : role === "operator" ? "Central de Operações" : "Admin PulsePass"}</strong><span>{role === "organizer" ? "Workspace do organizador" : role === "operator" ? "Monitoramento em tempo real" : "Controle da plataforma"}</span></div><div><button className="icon-btn"><Icon name="bell"/><span className="alert-dot"/></button><span className="avatar">{role === "admin" ? "LC" : role === "operator" ? "RS" : "AP"}</span></div></header><main className="dashboard-content">{children}</main></div></div>;
}

function Metric({ icon, label, value, delta, tone = "" }: { icon: IconName; label: string; value: string; delta?: string; tone?: string }) {
  return <div className="metric"><span className={`metric-icon ${tone}`}><Icon name={icon}/></span><div><span>{label}</span><strong>{value}</strong>{delta && <small>{delta}</small>}</div></div>;
}

function SimpleChart() {
  const points = [35,42,38,58,52,70,65,82,77,93,88,105];
  return <div className="chart"><div className="chart-y"><span>120</span><span>80</span><span>40</span><span>0</span></div><div className="chart-area"><div className="grid-lines"/><svg viewBox="0 0 600 180" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b5ee8" stopOpacity=".22"/><stop offset="1" stopColor="#5b5ee8" stopOpacity="0"/></linearGradient></defs><path d={`M0,${180-points[0]} ${points.map((p,i) => `L${i*54},${180-p}`).join(" ")} L594,180 L0,180Z`} fill="url(#fill)" stroke="none"/><path d={`M0,${180-points[0]} ${points.map((p,i) => `L${i*54},${180-p}`).join(" ")}`} fill="none" stroke="#5b5ee8" strokeWidth="4" vectorEffect="non-scaling-stroke"/></svg><div className="chart-x"><span>01 nov</span><span>08 nov</span><span>15 nov</span><span>22 nov</span><span>30 nov</span></div></div></div>;
}

function OrganizerDashboard({ go }: { go: (p: Page) => void }) {
  return <DashboardShell role="organizer" page="organizer" go={go}><PageTitle eyebrow="VISÃO GERAL" title="Olá, Aurora Produções" subtitle="Acompanhe o desempenho dos seus eventos." action={<Button icon="plus" onClick={() => go("create-event")}>Criar evento</Button>}/><div className="metrics-grid"><Metric icon="calendar" label="Eventos ativos" value="8" delta="+2 este mês"/><Metric icon="ticket" label="Ingressos vendidos" value="12.480" delta="+18,4% no período"/><Metric icon="clock" label="Reservas ativas" value="342" delta="Neste momento"/><Metric icon="chart" label="Receita simulada" value="R$ 1,8 mi" delta="+12,2% no período"/></div><div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-head"><div><h2>Vendas ao longo do tempo</h2><p>Ingressos vendidos nos últimos 30 dias</p></div><Select><option>Últimos 30 dias</option></Select></div><SimpleChart/></section><section className="panel performance"><h2>Ocupação geral</h2><div className="donut"><div><strong>74%</strong><span>ocupado</span></div></div><div className="legend-lines"><span><i/>Vendidos <strong>12.480</strong></span><span><i/>Disponíveis <strong>4.380</strong></span></div></section></div><RecentEvents go={go}/></DashboardShell>;
}

function RecentEvents({ go }: { go: (p: Page) => void }) {
  return <section className="panel recent"><div className="panel-head"><div><h2>Eventos recentes</h2><p>Desempenho dos seus principais eventos.</p></div><Button variant="ghost" onClick={() => go("organizer-events")}>Ver todos <Icon name="arrow"/></Button></div><div className="data-table dashboard-table"><div className="table-row head"><span>Evento</span><span>Data</span><span>Vendidos</span><span>Disponibilidade</span><span>Status</span></div>{events.slice(0,4).map((e,i) => <div className="table-row" key={e.name}><span className="table-event"><img src={e.image}/><strong>{e.name}</strong></span><span>{e.date} 2026</span><strong>{[4850,2180,3940,1510][i].toLocaleString("pt-BR")}</strong><span><i className="progress"><b style={{width: `${[82,65,74,38][i]}%`}}/></i>{[18,35,26,62][i]}%</span><Badge tone={i === 3 ? "neutral" : "success"}>{i === 3 ? "Rascunho" : "Publicado"}</Badge></div>)}</div></section>;
}

function OrganizerEvents({ go }: { go: (p: Page) => void }) {
  return <DashboardShell role="organizer" page="organizer-events" go={go}><PageTitle eyebrow="GESTÃO" title="Meus eventos" subtitle="Crie, edite e acompanhe seus eventos." action={<Button icon="plus" onClick={() => go("create-event")}>Criar evento</Button>}/><div className="table-tools"><Search placeholder="Buscar eventos..."/><Select><option>Todos os status</option><option>Publicado</option></Select></div><section className="panel"><div className="data-table event-admin-table"><div className="table-row head"><span>Evento</span><span>Data</span><span>Local</span><span>Ingressos</span><span>Vendidos</span><span>Status</span><span>Ações</span></div>{events.slice(0,5).map((e,i) => <div className="table-row" key={e.name}><span className="table-event"><img src={e.image}/><strong>{e.name}</strong></span><span>{e.date} 2026</span><span>{e.place}</span><span>{[6000,3500,5200,4000,2200][i]}</span><strong>{[4850,2180,3940,1510,0][i]}</strong><Badge tone={i === 4 ? "neutral" : "success"}>{i === 4 ? "Rascunho" : "Publicado"}</Badge><span className="row-actions"><button onClick={() => go("sales")} title="Ver vendas"><Icon name="chart"/></button><button title="Editar"><Icon name="edit"/></button><button onClick={() => go("manage-seats")} title="Gerenciar assentos"><Icon name="ticket"/></button></span></div>)}</div></section></DashboardShell>;
}

function CreateEvent({ go }: { go: (p: Page) => void }) {
  const [step, setStep] = useState(1);
  const [numbered, setNumbered] = useState(true);
  const labels = ["Informações básicas", "Data e local", "Ingressos", "Assentos"];
  return <DashboardShell role="organizer" page="create-event" go={go}><div className="breadcrumbs"><button onClick={() => go("organizer-events")}>Eventos</button><Icon name="chevron" size={14}/><span>Criar evento</span></div><PageTitle title="Criar novo evento" subtitle="Preencha as informações para publicar sua experiência."/><div className="stepper">{labels.map((l,i) => <button className={step === i+1 ? "active" : step > i+1 ? "done" : ""} onClick={() => setStep(i+1)} key={l}><span>{step > i+1 ? <Icon name="check"/> : i+1}</span><strong>{l}</strong></button>)}</div><section className="panel create-form">
    {step === 1 && <><h2>Informações básicas</h2><p>Conte ao público o que torna seu evento especial.</p><div className="form-grid"><div className="wide"><Field label="Nome do evento" placeholder="Ex.: Festival Horizonte 2027"/></div><div className="wide field"><span>Descrição</span><textarea placeholder="Descreva a experiência, atrações e informações importantes..."/></div><Select label="Categoria"><option>Selecione uma categoria</option><option>Música</option><option>Tecnologia</option></Select><label className="field"><span>Imagem de capa</span><div className="upload"><Icon name="plus"/><strong>Enviar imagem</strong><small>PNG ou JPG, até 10 MB</small></div></label></div></>}
    {step === 2 && <><h2>Data e local</h2><p>Defina quando e onde seu evento acontecerá.</p><div className="form-grid"><Field label="Data" type="date"/><Field label="Horário" type="time"/><div className="wide"><Field label="Local" placeholder="Nome do espaço"/></div><div className="wide"><Field label="Endereço" placeholder="Rua, número e complemento"/></div><Field label="Cidade" placeholder="Cidade"/><Select label="Estado"><option>Rio Grande do Sul</option></Select></div></>}
    {step === 3 && <><div className="panel-head"><div><h2>Ingressos e lotes</h2><p>Configure preços, quantidades e períodos de venda.</p></div><Button variant="outline" icon="plus">Adicionar lote</Button></div><div className="lot-card"><div className="lot-title"><strong>Lote 1</strong><Badge tone="info">Em edição</Badge></div><div className="form-grid"><Field label="Nome" defaultValue="Primeiro lote"/><Field label="Quantidade" defaultValue="1000"/><Field label="Preço" defaultValue="R$ 120,00"/><Field label="Início das vendas" type="date"/><Field label="Fim das vendas" type="date"/></div></div></>}
    {step === 4 && <><h2>Configuração de assentos</h2><p>Escolha como o público selecionará os ingressos.</p><div className="choice-cards"><button className={!numbered ? "selected" : ""} onClick={() => setNumbered(false)}><span className="radio"/><Icon name="users"/><strong>Sem assentos numerados</strong><p>Ideal para pista e espaços de circulação livre.</p></button><button className={numbered ? "selected" : ""} onClick={() => setNumbered(true)}><span className="radio"/><Icon name="ticket"/><strong>Com assentos numerados</strong><p>Configure setores, fileiras e posições.</p></button></div>{numbered && <div className="seat-config-preview"><div><strong>Mapa simplificado</strong><p>6 fileiras · 16 assentos por fileira</p></div><Button variant="outline" onClick={() => go("manage-seats")}>Configurar mapa</Button></div>}</>}
    <div className="form-actions"><Button variant="ghost" onClick={() => step === 1 ? go("organizer-events") : setStep(step-1)}>{step === 1 ? "Cancelar" : "Voltar"}</Button><Button onClick={() => step < 4 ? setStep(step+1) : go("organizer-events")}>{step < 4 ? "Continuar" : "Salvar evento"} <Icon name="arrow"/></Button></div>
  </section></DashboardShell>;
}

function ManageSeats({ go }: { go: (p: Page) => void }) {
  return <DashboardShell role="organizer" page="organizer-events" go={go}><div className="breadcrumbs"><button onClick={() => go("organizer-events")}>Eventos</button><Icon name="chevron" size={14}/><span>Gerenciar assentos</span></div><PageTitle title="Mapa de assentos" subtitle="Rock Festival Porto Alegre · Pista Premium" action={<Button>Salvar alterações</Button>}/><div className="metrics-grid compact-metrics"><Metric icon="users" label="Capacidade" value="6.000"/><Metric icon="check" label="Disponíveis" value="1.150"/><Metric icon="clock" label="Reservados" value="342"/><Metric icon="ticket" label="Vendidos" value="4.508"/></div><section className="panel admin-map"><div className="map-toolbar"><div><strong>Setor Pista Premium</strong><span>Clique para bloquear ou liberar assentos</span></div><Button variant="outline">Editar setor</Button></div><SeatMap admin/></section></DashboardShell>;
}

function Sales({ go }: { go: (p: Page) => void }) {
  return <DashboardShell role="organizer" page="sales" go={go}><PageTitle eyebrow="ROCK FESTIVAL PORTO ALEGRE" title="Vendas do evento" subtitle="Dados atualizados em tempo real."/><div className="metrics-grid"><Metric icon="chart" label="Receita" value="R$ 842 mil"/><Metric icon="ticket" label="Ingressos vendidos" value="4.850"/><Metric icon="clock" label="Reservas ativas" value="128"/><Metric icon="users" label="Taxa de ocupação" value="81%"/></div><section className="panel chart-panel"><div className="panel-head"><div><h2>Vendas ao longo do tempo</h2><p>Desempenho nos últimos 30 dias</p></div></div><SimpleChart/></section><section className="panel recent"><h2>Pedidos recentes</h2><div className="data-table"><div className="table-row head"><span>Pedido</span><span>Cliente</span><span>Ingresso</span><span>Valor</span><span>Status</span><span>Data</span></div>{orders.map((o,i) => <div className="table-row" key={o[0]}><strong>{o[0]}</strong><span>{["Marina Lima","João Martins","Ana Ribeiro","Caio Nunes"][i]}</span><span>Pista Premium · B{14+i}</span><strong>{o[3]}</strong><Badge tone={o[5] as "success"}>{o[4]}</Badge><span>{o[2]}</span></div>)}</div></section></DashboardShell>;
}

function Operator({ go }: { go: (p: Page) => void }) {
  return <DashboardShell role="operator" page="operator" go={go}><PageTitle eyebrow="CENTRAL OPERACIONAL" title="Visão em tempo real" subtitle="Acompanhe o fluxo de pedidos, reservas e emissões."/><div className="metrics-grid"><Metric icon="orders" label="Pedidos processados" value="18.492" delta="+9,2% hoje"/><Metric icon="clock" label="Pagamentos aguardando" value="184" tone="warning"/><Metric icon="ticket" label="Reservas ativas" value="642"/><Metric icon="check" label="Ingressos emitidos" value="16.805"/></div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2>Atividades recentes</h2><p>Atualizações automáticas da plataforma.</p></div><Badge tone="success">Sistema estável</Badge></div><div className="activity-list">{[["Pagamento aprovado","#PP-10482 · Marina Lima","Agora","check"],["Reserva criada","#PP-10483 · Assento C08","1 min","clock"],["Ingresso emitido","TKT-8745-PP","2 min","ticket"],["Pagamento aguardando","#PP-10484 · PIX","4 min","card"],["Reserva expirada","#PP-10472 · Assento A12","8 min","x"]].map(a => <div className="activity" key={a[1]}><span><Icon name={a[3] as IconName}/></span><div><strong>{a[0]}</strong><p>{a[1]}</p></div><small>{a[2]}</small></div>)}</div></section><section className="panel status-panel"><h2>Saúde dos serviços</h2>{["Catálogo de eventos","Serviço de reservas","Gateway de pagamento","Emissão de ingressos"].map(x => <div key={x}><span><i/> {x}</span><Badge tone="success">Operacional</Badge></div>)}</section></div></DashboardShell>;
}

function Admin({ go }: { go: (p: Page) => void }) {
  return <DashboardShell role="admin" page="admin" go={go}><PageTitle eyebrow="ADMINISTRAÇÃO" title="Dashboard da plataforma" subtitle="Indicadores gerais do ecossistema PulsePass."/><div className="metrics-grid"><Metric icon="users" label="Usuários cadastrados" value="128.450" delta="+2.840 este mês"/><Metric icon="user" label="Organizadores" value="342"/><Metric icon="calendar" label="Eventos ativos" value="186"/><Metric icon="orders" label="Pedidos" value="482 mil"/></div><div className="dashboard-grid"><section className="panel chart-panel"><h2>Crescimento da plataforma</h2><SimpleChart/></section><section className="panel status-panel"><h2>Resumo por papel</h2>{[["Clientes","126.980"],["Organizadores","342"],["Operadores","84"],["Administradores","12"]].map(x => <div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</section></div><RecentEvents go={go}/></DashboardShell>;
}

function AdminUsers({ go }: { go: (p: Page) => void }) {
  const users = [["Marina Lima","marina@email.com","Cliente","Ativo"],["Aurora Produções","contato@aurora.com","Organizador","Ativo"],["Rafael Souza","rafael@pulsepass.com","Operador","Ativo"],["Lucas Costa","lucas@pulsepass.com","Admin","Ativo"],["Carla Mendes","carla@email.com","Cliente","Bloqueado"]];
  return <DashboardShell role="admin" page="admin-users" go={go}><PageTitle eyebrow="CONTROLE DE ACESSO" title="Usuários" subtitle="Gerencie perfis, papéis e status de acesso." action={<Button icon="plus">Adicionar usuário</Button>}/><div className="table-tools"><Search placeholder="Buscar por nome ou e-mail..."/><Select><option>Todos os papéis</option></Select></div><section className="panel"><div className="data-table users-table"><div className="table-row head"><span>Nome</span><span>E-mail</span><span>Papel</span><span>Status</span><span>Ações</span></div>{users.map((u,i) => <div className="table-row" key={u[1]}><span className="user-cell"><span className="avatar">{u[0].split(" ").map(x=>x[0]).slice(0,2).join("")}</span><strong>{u[0]}</strong></span><span>{u[1]}</span><Badge tone="info">{u[2]}</Badge><Badge tone={i === 4 ? "danger" : "success"}>{u[3]}</Badge><button><Icon name="edit"/></button></div>)}</div></section></DashboardShell>;
}

function Audit({ go }: { go: (p: Page) => void }) {
  const logs = [["21/11/2026 10:42:18","Rafael Souza","Ingresso emitido","TKT-8745-PP"],["21/11/2026 10:41:57","Sistema","Pagamento confirmado","#PP-10482"],["21/11/2026 10:39:12","Aurora Produções","Evento atualizado","EVT-2201"],["21/11/2026 10:35:04","Lucas Costa","Usuário desbloqueado","USR-4832"],["21/11/2026 10:32:41","Marina Lima","Reserva criada","RSV-9021"]];
  return <DashboardShell role="admin" page="audit" go={go}><PageTitle eyebrow="SEGURANÇA" title="Auditoria" subtitle="Registro de ações relevantes realizadas na plataforma."/><div className="table-tools"><Search placeholder="Buscar ação ou recurso..."/><Select><option>Últimas 24 horas</option></Select></div><section className="panel"><div className="data-table audit-table"><div className="table-row head"><span>Data/hora</span><span>Usuário</span><span>Ação</span><span>Recurso</span></div>{logs.map(l => <div className="table-row" key={l[0]}><span>{l[0]}</span><strong>{l[1]}</strong><span>{l[2]}</span><code>{l[3]}</code></div>)}</div></section></DashboardShell>;
}

function NavigationMap({ go }: { go: (p: Page) => void }) {
  const FlowBox = ({ children, page }: { children: React.ReactNode; page?: Page }) => <button className="flow-box" onClick={() => page && go(page)}>{children}</button>;
  return <main className="nav-map-page"><div className="nav-map-header"><div><Logo onClick={() => go("events")}/><Badge tone="purple">Protótipo navegável</Badge></div><PageTitle title="Navigation Map" subtitle="Mapa visual dos principais fluxos e papéis da plataforma PulsePass." action={<Button variant="outline" onClick={() => go("events")}>Voltar à aplicação</Button>}/></div>
    <section className="flow-section customer-flow"><div className="flow-title"><span>01</span><div><h2>Fluxo Cliente</h2><p>Descoberta, compra e acesso ao ingresso.</p></div></div><div className="flow-chain"><FlowBox page="login">Login / Cadastro</FlowBox><i>→</i><FlowBox page="events">Catálogo de eventos</FlowBox><i>→</i><FlowBox page="event">Detalhes do evento</FlowBox><i>→</i><FlowBox page="seats">Seleção de assentos</FlowBox><i>→</i><FlowBox page="reservation">Reserva · 10 min</FlowBox><i>→</i><FlowBox page="checkout">Checkout</FlowBox><i>→</i><FlowBox page="processing">Pagamento</FlowBox><i>→</i><FlowBox page="success">Confirmação</FlowBox><i>→</i><FlowBox page="ticket">Ingresso</FlowBox></div><div className="secondary-flows"><div><FlowBox page="events">Catálogo</FlowBox><i>→</i><FlowBox page="orders">Meus pedidos</FlowBox><i>→</i><FlowBox page="order">Detalhes do pedido</FlowBox></div><div><FlowBox page="events">Catálogo</FlowBox><i>→</i><FlowBox page="tickets">Meus ingressos</FlowBox><i>→</i><FlowBox page="ticket">Ingresso</FlowBox></div><div><FlowBox>Perfil</FlowBox><i>→</i><FlowBox page="login">Logout</FlowBox></div></div></section>
    <div className="role-flows"><section className="flow-section"><div className="flow-title"><span>02</span><div><h2>Fluxo Organizador</h2><p>Criação e gestão de eventos.</p></div></div><div className="vertical-flow"><FlowBox page="login">Login</FlowBox><i>↓</i><FlowBox page="organizer">Dashboard</FlowBox><i>↓</i><FlowBox page="organizer-events">Meus eventos</FlowBox><div className="flow-branches"><FlowBox page="create-event">Criar / Editar</FlowBox><FlowBox page="manage-seats">Gerenciar assentos</FlowBox><FlowBox page="sales">Visualizar vendas</FlowBox></div></div></section>
      <section className="flow-section"><div className="flow-title"><span>03</span><div><h2>Fluxo Operador</h2><p>Monitoramento operacional.</p></div></div><div className="vertical-flow"><FlowBox page="login">Login</FlowBox><i>↓</i><FlowBox page="operator">Dashboard operacional</FlowBox><div className="flow-branches"><FlowBox>Eventos</FlowBox><FlowBox>Pedidos</FlowBox><FlowBox>Ingressos</FlowBox></div></div></section>
      <section className="flow-section"><div className="flow-title"><span>04</span><div><h2>Fluxo Admin</h2><p>Governança da plataforma.</p></div></div><div className="vertical-flow"><FlowBox page="login">Login</FlowBox><i>↓</i><FlowBox page="admin">Admin Dashboard</FlowBox><div className="flow-branches"><FlowBox page="admin-users">Usuários</FlowBox><FlowBox>Organizadores</FlowBox><FlowBox>Eventos</FlowBox><FlowBox page="audit">Auditoria</FlowBox></div></div></section></div>
    <div className="map-legend"><span><i/> Clique nas caixas para navegar</span><span>Setas indicam a progressão principal do fluxo</span></div>
  </main>;
}

function StatesPage({ go }: { go: (p: Page) => void }) {
  return <main className="content-section states-page">
    <div className="breadcrumbs"><button onClick={() => go("events")}>PulsePass</button><Icon name="chevron" size={14}/><span>Estados do sistema</span></div>
    <PageTitle eyebrow="07 — STATES AND ERRORS" title="Estados e casos de erro" subtitle="Referência visual para comportamentos críticos da plataforma."/>
    <section className="state-group"><h2>Estados de domínio</h2><div className="state-reference-grid">
      <div className="reference-card"><strong>Pedido</strong><div><Badge tone="neutral">Criado</Badge><Badge tone="info">Reservado</Badge><Badge tone="warning">Aguardando pagamento</Badge><Badge tone="success">Pago</Badge><Badge tone="danger">Expirado</Badge></div></div>
      <div className="reference-card"><strong>Evento</strong><div><Badge tone="neutral">Rascunho</Badge><Badge tone="success">Publicado</Badge><Badge tone="danger">Encerrado</Badge></div></div>
      <div className="reference-card"><strong>Pagamento</strong><div><Badge tone="warning">Aguardando</Badge><Badge tone="info">Processando</Badge><Badge tone="success">Confirmado</Badge><Badge tone="danger">Falhou</Badge></div></div>
      <div className="reference-card"><strong>Assento</strong><div className="inline-seat-states"><span><i className="available"/>Disponível</span><span><i className="selected"/>Selecionado</span><span><i className="reserved"/>Reservado</span><span><i className="sold"/>Vendido</span></div></div>
    </div></section>
    <section className="state-group"><h2>Feedback e exceções</h2><div className="error-showcase">
      <div className="error-card"><span className="error-card-icon"><Icon name="ticket"/></span><Badge tone="danger">Conflito de reserva</Badge><h3>O assento selecionado acabou de ser reservado por outra pessoa.</h3><p>Atualizamos o mapa para mostrar a disponibilidade mais recente.</p><Button variant="outline" onClick={() => go("seats")}>Escolher outro assento</Button></div>
      <div className="error-card"><span className="error-card-icon"><Icon name="card"/></span><Badge tone="danger">Pagamento falhou</Badge><h3>Não foi possível processar o pagamento.</h3><p>Verifique os dados informados ou escolha outra forma de pagamento.</p><Button variant="outline" onClick={() => go("checkout")}>Tentar novamente</Button></div>
      <div className="error-card"><span className="error-card-icon"><Icon name="clock"/></span><Badge tone="warning">Tempo esgotado</Badge><h3>Sua reserva expirou.</h3><p>O assento foi liberado e pode ser selecionado por outra pessoa.</p><Button variant="outline" onClick={() => go("seats")}>Voltar aos assentos</Button></div>
      <div className="error-card empty-card"><span className="empty-illustration"><Icon name="search" size={28}/></span><Badge tone="neutral">Estado vazio</Badge><h3>Não encontramos eventos.</h3><p>Tente remover alguns filtros ou buscar por outro termo.</p><Button variant="outline" onClick={() => go("events")}>Limpar filtros</Button></div>
      <div className="error-card loading-card"><span className="spinner"/><Badge tone="info">Carregando</Badge><h3>Buscando os melhores eventos...</h3><p>Aguarde enquanto atualizamos o catálogo.</p><div className="skeleton-lines"><i/><i/><i/></div></div>
    </div></section>
  </main>;
}

function PublicLayout({ page, go, children }: { page: Page; go: (p: Page) => void; children: React.ReactNode }) {
  const [notifications, setNotifications] = useState(false);
  return <><Header go={go} notifications={notifications} setNotifications={setNotifications}/>{children}<Footer go={go}/></>;
}

export default function App() {
  const [page, setPage] = useState<Page>("events");
  const go = (p: Page) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const render = () => {
    if (page === "login") return <AuthPage go={go}/>;
    if (page === "signup") return <AuthPage signup go={go}/>;
    if (page === "organizer") return <OrganizerDashboard go={go}/>;
    if (page === "organizer-events") return <OrganizerEvents go={go}/>;
    if (page === "create-event") return <CreateEvent go={go}/>;
    if (page === "manage-seats") return <ManageSeats go={go}/>;
    if (page === "sales") return <Sales go={go}/>;
    if (page === "operator") return <Operator go={go}/>;
    if (page === "admin") return <Admin go={go}/>;
    if (page === "admin-users") return <AdminUsers go={go}/>;
    if (page === "audit") return <Audit go={go}/>;
    if (page === "navigation") return <NavigationMap go={go}/>;
    if (page === "states") return <PublicLayout page={page} go={go}><StatesPage go={go}/></PublicLayout>;
    if (page === "processing") return <Processing go={go}/>;
    const content: Record<string, React.ReactNode> = {
      events: <EventsPage go={go}/>, event: <EventDetails go={go}/>, seats: <SeatsPage go={go}/>,
      reservation: <Reservation go={go}/>, checkout: <Checkout go={go}/>, success: <Success go={go}/>,
      ticket: <TicketPage go={go}/>, tickets: <Tickets go={go}/>, orders: <Orders go={go}/>, order: <OrderDetail go={go}/>,
    };
    return <PublicLayout page={page} go={go}>{content[page]}</PublicLayout>;
  };
  return render();
}
