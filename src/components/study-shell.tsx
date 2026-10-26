
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  BookOpen,
  CalendarDays,
  House,
  Timer,
  ChartNoAxesCombined,
  ChevronDown,
  ShieldCheck,
  MoreHorizontal,
  Settings,
  Download,
  LogOut,
  UserRound,
  Cloud,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useStudies } from './study-provider';
import { AccountDialog } from './study-views';
import appIcon from '@/assets/atrilha-app-icon.png.asset.json';
import appLogo from '@/assets/atrilha-logo.png.asset.json';

const nav = [
  { to: '/', label: 'Início', icon: House },
  { to: '/estudar', label: 'Estudar', icon: Timer },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarDays },
  { to: '/edital', label: 'Edital', icon: BookOpen },
  { to: '/evolucao', label: 'Evolução', icon: ChartNoAxesCombined },
] as const;

type DialogMode = 'account' | 'settings' | 'backup' | '';

export function StudyShell({
  children,
}: {
  children: ReactNode;
}) {
  const { user, data, login, logout } = useStudies();
  const path = useLocation({ select: (state) => state.pathname });

  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>('');

  const profileName =
    data.profile?.display_name ||
    user?.user_metadata?.['full_name'] ||
    user?.user_metadata?.['name'] ||
    '';

  const firstName = profileName.trim().split(/\s+/)[0];
  const accountLabel = user
    ? firstName || 'Minha conta'
    : 'Entrar com Google';

  const currentPage =
    nav.find((item) => item.to === path)?.label ?? 'Início';

  const openDialog = (mode: Exclude<DialogMode, ''>) => {
    setMenu(false);
    setDialog(mode);
  };

  const handleAccountAction = () => {
    if (user) {
      setMenu((current) => !current);
      return;
    }

    void login();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          to="/"
          className="brand"
          aria-label="A Trilha Concursos — página inicial"
        >
          <img className="brand-logo" src={appLogo.url} alt="A Trilha Concursos" />
        </Link>

        <div className="workspace-label">
          SEU ESPAÇO DE ESTUDOS
        </div>

        <nav className="primary-nav" aria-label="Navegação principal">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;

            return (
              <Button
                key={item.to}
                asChild
                variant="ghost"
                className={`nav-item ${active ? 'nav-active' : ''}`}
              >
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
                  <span>{item.label}</span>
                  {active && <span className="nav-dot" />}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="quiet-note">
            <span className="quiet-note-icon">
              <ShieldCheck size={20} />
            </span>

            <div>
              <strong>Um passo de cada vez.</strong>
              <p>Consistência constrói resultados.</p>
            </div>
          </div>

          <div className="sidebar-tools">
            <Button
              variant="ghost"
              className="nav-item"
              onClick={() => openDialog('settings')}
            >
              <Settings size={18} />
              <span>Configurações</span>
            </Button>

            <Button
              variant="ghost"
              className="nav-item"
              onClick={() => openDialog('backup')}
            >
              <Download size={18} />
              <span>Backup e exportação</span>
            </Button>
          </div>

          <div className="sidebar-account">
            <span className="avatar">
              <UserRound size={18} />
            </span>

            <div className="sidebar-account-copy">
              <strong>{user ? accountLabel : 'Seu espaço pessoal'}</strong>
              <small>
                {user ? 'Conta conectada' : 'Entre para sincronizar'}
              </small>
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir opções da conta"
              onClick={() => openDialog('account')}
            >
              <MoreHorizontal size={20} />
            </Button>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <Link to="/" className="mobile-brand">
            <img className="brand-mark app-brand-icon" src={appIcon.url} alt="" />
            <strong>A Trilha Concursos</strong>
          </Link>

          <div className="breadcrumb" aria-label="Localização atual">
            <span>Meu espaço</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{currentPage}</strong>
          </div>

          <div className="topbar-actions">
            <span className="sync-status">
              <Cloud size={15} />
              <span>
                {user ? 'Conta sincronizada' : 'Painel pessoal'}
              </span>
            </span>

            <div className="account-actions">
              <Button
                variant="outline"
                className="account-button"
                onClick={handleAccountAction}
                aria-expanded={user ? menu : undefined}
                aria-haspopup={user ? 'menu' : undefined}
              >
                <span className="avatar small">
                  <UserRound size={15} />
                </span>

                <span className="account-button-label">
                  {accountLabel}
                </span>

                <ChevronDown size={14} />
              </Button>

              {menu && (
                <>
                  <button
                    type="button"
                    className="menu-dismiss"
                    aria-label="Fechar menu da conta"
                    onClick={() => setMenu(false)}
                  />

                  <div className="account-menu" role="menu">
                    <Button
                      variant="ghost"
                      role="menuitem"
                      onClick={() => openDialog('account')}
                    >
                      <UserRound size={16} />
                      Minha conta
                    </Button>

                    <Button
                      variant="ghost"
                      role="menuitem"
                      onClick={() => openDialog('settings')}
                    >
                      <Settings size={16} />
                      Configurações
                    </Button>

                    <Button
                      variant="ghost"
                      role="menuitem"
                      onClick={() => openDialog('backup')}
                    >
                      <Download size={16} />
                      Backup e exportação
                    </Button>

                    {user && (
                      <Button
                        variant="ghost"
                        role="menuitem"
                        onClick={() => {
                          setMenu(false);
                          void logout();
                        }}
                      >
                        <LogOut size={16} />
                        Sair da conta
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            <Button
              className="mobile-menu"
              size="icon"
              variant="ghost"
              aria-label="Abrir opções da conta"
              onClick={() =>
                user
                  ? setMenu((current) => !current)
                  : void login()
              }
            >
              <MoreHorizontal size={21} />
            </Button>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>

        <footer className="page-footer">
          <span>
            <strong>A Trilha Concursos</strong>
            <span className="footer-dot">·</span>
            Consistência constrói resultados.
          </span>

          <span className="footer-privacy">
            <ShieldCheck size={14} />
            Seus dados, sob seu controle.
          </span>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Navegação inferior">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = path === item.to;

          return (
            <Button
              key={item.to}
              variant="ghost"
              asChild
              className={active ? 'active' : ''}
            >
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      {dialog !== '' && (
        <AccountDialog
          mode={dialog}
          close={() => setDialog('')}
        />
      )}
    </div>
  );
}
