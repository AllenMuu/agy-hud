import { HUDLanguage } from '../types/config.js';

export interface HUDTranslations {
  context: string;
  usage: string;
  tools: string;
  agents: string;
  todos: string;
  remaining: string;
  used: string;
  clean: string;
  dirty: string;
  time: string;
  fiveHour: string;
  weekly: string;
  geminiGroup: string;
  claudeGroup: string;
}

const DICTIONARY: Record<HUDLanguage, HUDTranslations> = {
  en: {
    context: 'Context',
    usage: 'Usage',
    tools: 'Tools',
    agents: 'Agents',
    todos: 'Tasks',
    remaining: 'rem.',
    used: 'used',
    clean: 'clean',
    dirty: 'dirty',
    time: 'Time',
    fiveHour: '5h',
    weekly: 'Wk',
    geminiGroup: 'Gemini',
    claudeGroup: 'Claude/GPT',
  },
  zh: {
    context: '上下文',
    usage: '用量',
    tools: '工具',
    agents: '子代理',
    todos: '任务',
    remaining: '余',
    used: '已用',
    clean: '干净',
    dirty: '已修改',
    time: '耗时',
    fiveHour: '5h',
    weekly: '周',
    geminiGroup: 'Gemini',
    claudeGroup: 'Claude/GPT',
  },
  'zh-Hans': {
    context: '上下文',
    usage: '用量',
    tools: '工具',
    agents: '子代理',
    todos: '任务',
    remaining: '余',
    used: '已用',
    clean: '干净',
    dirty: '已修改',
    time: '耗时',
    fiveHour: '5h',
    weekly: '周',
    geminiGroup: 'Gemini',
    claudeGroup: 'Claude/GPT',
  },
  'zh-Hant': {
    context: '上下文',
    usage: '用量',
    tools: '工具',
    agents: '子代理',
    todos: '任務',
    remaining: '餘',
    used: '已用',
    clean: '乾淨',
    dirty: '已修改',
    time: '耗時',
    fiveHour: '5h',
    weekly: '周',
    geminiGroup: 'Gemini',
    claudeGroup: 'Claude/GPT',
  },
};

export function getTranslations(lang: HUDLanguage = 'en'): HUDTranslations {
  return DICTIONARY[lang] || DICTIONARY['en'];
}
