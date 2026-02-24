import logoImg from "@assets/image_1771694966878.png";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40">
      <div className="flex items-center justify-between gap-2 px-5 h-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <img src={logoImg} alt="GRG" className="h-14 w-auto object-contain" />
        </div>
        <h1 className="text-2xl font-bold truncate text-center flex-1" style={{ color: '#5c4a1e' }} data-testid="text-page-title">{title}</h1>
        <div className="w-8 flex-shrink-0" />
      </div>
    </header>
  );
}
