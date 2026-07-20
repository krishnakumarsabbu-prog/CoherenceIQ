import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Popover, DropdownItem, DropdownSeparator, DropdownLabel } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/misc";
import { ChevronDown, User, Settings, LifeBuoy, LogOut, KeyRound, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UserProfile() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-accent">
          <Avatar initials={user.avatar} className="h-7 w-7" />
          <div className="hidden flex-col leading-none lg:flex">
            <span className="text-[12px] font-semibold text-foreground">{user.name}</span>
            <span className="text-[10px] text-muted-foreground">{user.role}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      }
      contentClassName="w-[240px]"
    >
      <div className="flex items-center gap-3 border-b border-border p-3">
        <Avatar initials={user.avatar} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">{user.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-foreground">{user.tenant}</div>
            <div className="text-[9.5px] text-muted-foreground">Production · us-east-1</div>
          </div>
        </div>
      </div>
      <DropdownLabel>Account</DropdownLabel>
      <DropdownItem onClick={() => { setOpen(false); navigate("/admin"); }}><User className="h-4 w-4" /> Profile</DropdownItem>
      <DropdownItem onClick={() => setOpen(false)}><KeyRound className="h-4 w-4" /> API Keys</DropdownItem>
      <DropdownItem onClick={() => setOpen(false)}><Settings className="h-4 w-4" /> Preferences</DropdownItem>
      <DropdownSeparator />
      <DropdownItem onClick={() => setOpen(false)}><LifeBuoy className="h-4 w-4" /> Support & Docs</DropdownItem>
      <DropdownSeparator />
      <DropdownItem onClick={signOut} className="text-destructive hover:text-destructive"><LogOut className="h-4 w-4" /> Sign out</DropdownItem>
    </Popover>
  );
}
