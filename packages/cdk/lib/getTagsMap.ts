export default function getTagsMap(envName: string) {
  return {
    app: 'tasks',
    environment: envName,
    tasks: '1',
  }
}
