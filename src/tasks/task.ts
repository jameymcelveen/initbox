import { BaseTask, TaskConfig } from './base.js';

export default class Task extends BaseTask {
  static fromYaml(yamlText: string): Task {
    return new Task(yamlText ? TaskConfig.fromYaml(yamlText) : undefined);
  }
}
