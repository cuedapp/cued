"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, UserCheck, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button as AriaButton, ListBox, ListBoxItem, useDragAndDrop } from "react-aria-components";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { reorderUsers, updateUserAccess, type UserManagementState } from "./actions";

type ManagedUser = {
  id: string;
  displayName: string;
  primaryImageTag: string | null;
  role: "admin" | "user";
  disabled: boolean;
  accessEnabled: boolean;
};

export function UserManagementList({
  initialUsers,
  currentUserId,
  locale,
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
  locale: string;
}) {
  const t = useTranslations("Users");
  const [users, setUsers] = useState(initialUsers);
  const [orderState, orderAction, orderPending] = useActionState(reorderUsers, {} as UserManagementState);
  useEffect(() => {
    if (orderState.result) toast.success(t("orderSaved"));
    if (orderState.error) toast.error(t("managementFailed"));
  }, [orderState, t]);

  function persistOrder(reordered: ManagedUser[]) {
    setUsers(reordered);
    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("userIds", JSON.stringify(reordered.map((user) => user.id)));
    startTransition(() => orderAction(formData));
  }

  function moveUser(index: number, offset: -1 | 1) {
    const destination = index + offset;
    if (destination < 0 || destination >= users.length) return;
    const reordered = [...users];
    [reordered[index], reordered[destination]] = [reordered[destination]!, reordered[index]!];
    persistOrder(reordered);
  }

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": String(key) })),
    onReorder(event) {
      if (event.target.type !== "item") return;
      const movedIds = new Set([...event.keys].map(String));
      const moved = users.filter((user) => movedIds.has(user.id));
      const remaining = users.filter((user) => !movedIds.has(user.id));
      let destination = remaining.findIndex((user) => user.id === String(event.target.key));
      if (destination < 0) return;
      if (event.target.dropPosition === "after") destination += 1;
      const reordered = [...remaining.slice(0, destination), ...moved, ...remaining.slice(destination)];
      persistOrder(reordered);
    },
  });

  return (
    <ListBox
      aria-label={t("managementTitle")}
      items={users}
      dragAndDropHooks={dragAndDropHooks}
      className="divide-y divide-border/70"
      selectionMode="none"
    >
      {(user) => {
        const accessible = user.accessEnabled && !user.disabled;
        const index = users.findIndex((item) => item.id === user.id);
        return (
          <ListBoxItem
            id={user.id}
            textValue={user.displayName}
            className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 outline-none transition-colors data-[dragging]:opacity-50 data-[drop-target]:bg-primary/10 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:px-6"
          >
            <AriaButton
              slot="drag"
              className="grid size-9 shrink-0 cursor-move place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              aria-label={t("dragUser", { user: user.displayName })}
              isDisabled={orderPending}
            >
              <GripVertical className="size-5" />
            </AriaButton>
            <UserAvatar userId={user.id} name={user.displayName} avatarTag={user.primaryImageTag} className="size-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">
                {t(`roles.${user.role}`)} · {accessible ? t("active") : t("inactive")}
                {user.disabled ? ` · ${t("disabledInJellyfin")}` : ""}
              </p>
            </div>
            <div className="col-start-3 flex flex-wrap items-center gap-2 sm:col-start-auto">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={index === 0 || orderPending}
                  onClick={() => moveUser(index, -1)}
                  aria-label={t("moveUp")}
                  title={t("moveUp")}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={index === users.length - 1 || orderPending}
                  onClick={() => moveUser(index, 1)}
                  aria-label={t("moveDown")}
                  title={t("moveDown")}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
              <UserAccessControl
                userId={user.id}
                locale={locale}
                accessEnabled={user.accessEnabled}
                isCurrentUser={user.id === currentUserId}
              />
            </div>
          </ListBoxItem>
        );
      }}
    </ListBox>
  );
}

function UserAccessControl({
  userId,
  locale,
  accessEnabled,
  isCurrentUser,
}: {
  userId: string;
  locale: string;
  accessEnabled: boolean;
  isCurrentUser: boolean;
}) {
  const t = useTranslations("Users");
  const [state, action] = useActionState(updateUserAccess, {} as UserManagementState);
  useEffect(() => {
    if (state.result) toast.success(t("accessSaved"));
    if (state.error) toast.error(t("managementFailed"));
  }, [state, t]);
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="accessEnabled" value={String(!accessEnabled)} />
      <FormSubmitButton
        size="sm"
        variant={accessEnabled ? "outline" : "default"}
        disabled={isCurrentUser && accessEnabled}
        pendingLabel={t("savingAccess")}
        title={isCurrentUser && accessEnabled ? t("cannotDeactivateSelf") : undefined}
      >
        {accessEnabled ? <UserMinus className="size-4" /> : <UserCheck className="size-4" />}
        {accessEnabled ? t("deactivate") : t("activate")}
      </FormSubmitButton>
    </form>
  );
}
