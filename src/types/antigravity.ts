/**
 * Antigravity CLI Stdin JSON Schema
 * Passed to statusline command on every agent interaction.
 */
export interface AntigravityStdinPayload {
  session_id?: string;
  conversation_id?: string;
  model?: {
    id?: string;
    display_name?: string;
    provider?: string;
  } | string;
  workspace?: {
    root_path?: string;
    workspace_name?: string;
    added_dirs?: string[];
  };
  context?: {
    tokens_used?: number;
    tokens_limit?: number;
    tokens_percent?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    estimated_tokens_used?: number;
    current_usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    remaining_percentage?: number;
    used_percentage?: number;
  };
  quota?: {
    hourly_percent?: number;
    weekly_percent?: number;
    resets_in_seconds?: number;
    gemini?: {
      five_hour_percent?: number;
      weekly_percent?: number;
      resets_in?: string;
    };
    claude_gpt?: {
      five_hour_percent?: number;
      weekly_percent?: number;
      resets_in?: string;
    };
  };
  rate_limits?: Record<string, any>;
  current_turn?: {
    turn_index?: number;
    status?: 'idle' | 'running' | 'waiting_for_input' | 'error';
    duration_ms?: number;
  };
  app_data_dir?: string;
  transcript_path?: string;
}

/**
 * Antigravity Transcript Step Item Schema
 */
export interface TranscriptStep {
  step_index?: number;
  source?: 'USER_EXPLICIT' | 'MODEL' | 'SYSTEM';
  type?: 'USER_INPUT' | 'PLANNER_RESPONSE' | 'SUBAGENT_NOTIFICATION' | 'TOOL_RESULT';
  status?: 'DONE' | 'RUNNING' | 'ERROR';
  created_at?: string;
  content?: string;
  tool_calls?: Array<{
    name: string;
    args?: Record<string, any>;
    status?: 'RUNNING' | 'DONE' | 'ERROR';
  }>;
}

/**
 * Parsed recent activity item
 */
export interface RecentToolActivity {
  name: string;
  summary: string;
  status: 'running' | 'done' | 'error';
  count: number;
}

/**
 * Parsed Subagent Tracker item
 */
export interface SubagentActivity {
  conversationId: string;
  role: string;
  typeName: string;
  state: 'running' | 'idle' | 'waiting' | 'done' | 'error';
  elapsedMs: number;
}

/**
 * Parsed Todo/Task progress
 */
export interface TodoProgress {
  total: number;
  completed: number;
  currentTaskTitle?: string;
}
