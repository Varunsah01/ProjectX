"use server";

import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export async function getNotificationsAction() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) return actionFailure("Unauthorized");

    const rows = await db.notification.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        link: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const notifications: AppNotification[] = rows.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    }));

    return actionSuccess(notifications);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load notifications"));
  }
}

export async function markNotificationsReadAction(ids: string[]) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) return actionFailure("Unauthorized");

    await db.notification.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { read: true },
    });

    return actionSuccess(null);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to mark notifications as read"));
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) return actionFailure("Unauthorized");

    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return actionSuccess(null);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to mark all as read"));
  }
}
