import { useGameConfigStore, type MenuWidget } from "../../store/useGameConfigStore";

function MenuBody({ menu }: { menu: MenuWidget }) {
  const removeMenu = useGameConfigStore((s) => s.removeMenu);

  return (
    <div className="w-52">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary">{menu.title}</p>
        <button
          onClick={() => removeMenu(menu.id)}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove menu"
        >
          ×
        </button>
      </div>
      <div className="space-y-1.5">
        {["Play", "Options", "Quit"].map((label) => (
          <button
            key={label}
            className="w-full rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/20"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Menu card that lives in the chat feed and can be dragged into the viewport. */
export function ChatMenuCard({ menu }: { menu: MenuWidget }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/menu-id", menu.id)}
      className="glass-panel mb-3 cursor-grab rounded-2xl px-4 py-3 active:cursor-grabbing"
    >
      <MenuBody menu={menu} />
      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        Drag onto the world to place
      </p>
    </div>
  );
}

/** Menus already dropped onto the 3D viewport overlay. */
export function PlacedMenus() {
  const menus = useGameConfigStore((s) => s.menus);
  const placeMenu = useGameConfigStore((s) => s.placeMenu);

  return (
    <>
      {menus
        .filter((m) => m.placed)
        .map((menu) => (
          <div
            key={menu.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/menu-id", menu.id)}
            onDragEnd={(e) => placeMenu(menu.id, e.clientX - 100, e.clientY - 20)}
            className="glass-panel pointer-events-auto absolute cursor-grab rounded-2xl px-4 py-3 active:cursor-grabbing"
            style={{ left: menu.x, top: menu.y }}
          >
            <MenuBody menu={menu} />
          </div>
        ))}
    </>
  );
}
