export interface BashOperations {
  exec(command: string): Promise<{ stdout: string; exitCode: number }>;
}
