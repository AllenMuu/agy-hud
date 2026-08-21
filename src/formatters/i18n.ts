import { HUDLanguage } from '../types/config.js';

export interface HUDTranslations {
  context: string;
  usage: string;
  tools: string;
  agents: string;
  todos: string;
  remaining: string;
  clean: string;
  dirty: string;
  time: string;
}

const DICTIONARY: Record<HUDLanguage, HUDTranslations> = {
  en: {
    context: 'Context',
    usage: 'Usage',
    tools: 'Tools',
    agents: 'Agents',
    todos: 'Tasks',
    remaining: 'rem.',
    clean: 'clean',
    dirty: 'dirty',
    time: 'Time',
  },
  zh: {
    context: '上下文',
    usage: '用量',
    tools: '工具',
    agents: '子代理',
    todos: '任务',
    remaining: '剩余',
    clean: '干净',
    dirty: '已修改',
    time: '耗时',
  },
  'zh-Hans': {
    context: '上下文',
    usage: '用量',
    tools: '工具',
    agents: '子代理',
    todos: '任务',
    remaining: '剩余',
    clean: '干净',
    dirty: '已修改',
    time: '耗时',
  },
  'zh-Hant': {
    context: '上下文',
    usage: '用量',
    tools: '工具',
    agents: '子代理',
    todos: '任務',
    remaining: '剩餘',
    clean: '乾淨',
    dirty: '已修改',
    time: '耗時',
  },
};

export function getTranslations(lang: HUDLanguage = 'zh-Hans'): HUDTranslations {
  return DICTIONARY[lang] || DICTIONARY['zh-Hans'];
}
