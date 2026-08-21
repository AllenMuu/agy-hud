export interface VCSState {
  type: 'git' | 'jj' | 'none';
  branch: string;
  isDirty: boolean;
  ahead: number;
  behind: number;
  untracked: number;
  modified: number;
  staged: number;
}
