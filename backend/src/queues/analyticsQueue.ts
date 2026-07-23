import { CloudTasksClient } from '@google-cloud/tasks';

export async function enqueueAnalyticsTask(eventId: string, eventType: string): Promise<void> {
  const client = new CloudTasksClient();
  const project = process.env.PROJECT_ID!;
  const queue = client.queuePath(project, 'us-central1', 'analytics-queue');
  const url = `https://us-central1-${project}.cloudfunctions.net/processAnalyticsEvent`;

  await client.createTask({
    parent: queue,
    task: {
      httpRequest: {
        httpMethod: 'POST' as const,
        url,
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ eventId, eventType })).toString('base64'),
      },
    },
  });
}
