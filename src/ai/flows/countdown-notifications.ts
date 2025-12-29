'use server';
/**
 * @fileOverview A countdown notification AI agent.
 *
 * - countdownNotifications - A function that handles the countdown notification process.
 * - CountdownNotificationsInput - The input type for the countdownNotifications function.
 * - CountdownNotificationsOutput - The return type for the countdownNotifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CountdownNotificationsInputSchema = z.object({
  targetDate: z.string().describe('The target date and time for the countdown in ISO format.'),
  timeZone: z.string().describe('The time zone of the user, e.g., America/Los_Angeles.'),
  location: z.string().describe('The location of the user, e.g., Los Angeles, CA.'),
});
export type CountdownNotificationsInput = z.infer<typeof CountdownNotificationsInputSchema>;

const CountdownNotificationsOutputSchema = z.object({
  notificationMessage: z.string().describe('A message to display to the user when the countdown hits zero, adjusted for their time zone and location.'),
});
export type CountdownNotificationsOutput = z.infer<typeof CountdownNotificationsOutputSchema>;

export async function countdownNotifications(input: CountdownNotificationsInput): Promise<CountdownNotificationsOutput> {
  return countdownNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'countdownNotificationsPrompt',
  input: {schema: CountdownNotificationsInputSchema},
  output: {schema: CountdownNotificationsOutputSchema},
  prompt: `You are a notification service that sends out messages to users when their countdown timer hits zero.  
The notification message should be personalized to the user's time zone and location.

Target Date: {{{targetDate}}}
Time Zone: {{{timeZone}}}
Location: {{{location}}}

Craft a message that tells the user that the countdown has ended, taking into account that the current time zone of the user is {{{timeZone}}} and the user is in {{{location}}}. The target date was {{{targetDate}}}. Be friendly and helpful.
`,
});

const countdownNotificationsFlow = ai.defineFlow(
  {
    name: 'countdownNotificationsFlow',
    inputSchema: CountdownNotificationsInputSchema,
    outputSchema: CountdownNotificationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
