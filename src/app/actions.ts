
"use server";

import {
  countdownNotifications,
  type CountdownNotificationsInput,
} from "@/ai/flows/countdown-notifications";

export async function getCountdownNotification(
  input: CountdownNotificationsInput
) {
  const result = await countdownNotifications(input);
  return result;
}
