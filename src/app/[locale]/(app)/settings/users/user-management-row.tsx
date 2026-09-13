"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, UserCheck, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
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

  function finishDrag(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const currentIndex = users.findIndex((user) => user.id === event.active.id);
    const destinationIndex = users.findIndex((user) => user.id === event.over?.id);
    if (currentIndex < 0 || destinationIndex < 0) return;
    persistOrder(arrayMove(users, currentIndex, destinationIndex));
  }

  return (
    <DndContext id="user-management" sensors={sensors} collisionDetection={closestCenter} onDragEnd={finishDrag}>
      <SortableContext items={users.map((user) => user.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border/70" role="list" aria-label={t("managementTitle")}>
          {users.map((user, index) => (
            <SortableUserRow
              key={user.id}
              user={user}
              index={index}
              userCount={users.length}
              currentUserId={currentUserId}
              locale={locale}
              orderPending={orderPending}
              moveUser={moveUser}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableUserRow({
  user,
  index,
  userCount,
  currentUserId,
  locale,
  orderPending,
  moveUser,
}: {
  user: ManagedUser;
  index: number;
  userCount: number;
  currentUserId: string;
  locale: string;
  orderPending: boolean;
  moveUser: (index: number, offset: -1 | 1) => void;
}) {
  const t = useTranslations("Users");
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: user.id,
    disabled: orderPending,
  });
  const accessible = user.accessEnabled && !user.disabled;
  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`grid touch-pan-y cursor-grab select-none grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 bg-card px-3 py-3 outline-none transition-[background-color,box-shadow,opacity,transform] active:cursor-grabbing sm:gap-3 sm:px-6 sm:py-4 ${isDragging ? "relative z-10 scale-[1.01] bg-muted opacity-90 shadow-lg" : ""}`}
      {...listeners}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="grid size-8 shrink-0 touch-none !cursor-grab select-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:!cursor-grabbing active:bg-primary/10 active:text-primary disabled:!cursor-not-allowed"
        aria-label={t("dragUser", { user: user.displayName })}
        disabled={orderPending}
        {...attributes}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="pointer-events-none">
        <UserAvatar userId={user.id} name={user.displayName} avatarTag={user.primaryImageTag} className="size-10" />
      </span>
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate font-medium">{user.displayName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {t(`roles.${user.role}`)} · {accessible ? t("active") : t("inactive")}
          {user.disabled ? ` · ${t("disabledInJellyfin")}` : ""}
        </p>
      </div>
      <div
        className="flex shrink-0 touch-auto cursor-auto select-text items-center gap-1 sm:gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1" role="group" aria-label={t("reorderUser", { user: user.displayName })}>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9"
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
            className="size-9"
            disabled={index === userCount - 1 || orderPending}
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
    </div>
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
        className="size-9 p-0 sm:w-auto sm:px-3"
        disabled={isCurrentUser && accessEnabled}
        pendingLabel={t("savingAccess")}
        title={isCurrentUser && accessEnabled ? t("cannotDeactivateSelf") : undefined}
        aria-label={accessEnabled ? t("deactivate") : t("activate")}
      >
        {accessEnabled ? <UserMinus className="size-4" /> : <UserCheck className="size-4" />}
        <span className="sr-only sm:not-sr-only">{accessEnabled ? t("deactivate") : t("activate")}</span>
      </FormSubmitButton>
    </form>
  );
}
