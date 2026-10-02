import { TrialTeam, CreateTrialTeamData } from './types';

const STORAGE_TEAMS_KEY = 'ctms_cached_trial_teams_v1';

export const INITIAL_SAMPLE_TEAM: TrialTeam = {
  id: 'team_sample_001',
  teamId: 'TEAM001',
  teamName: 'AIIA Clinical Research Team',
  centreId: 'ctr_seed_001',
  centreName: 'All India Institute of Ayurveda (AIIA)',
  principalInvestigator: 'Dr. Arjun Kumar',
  teamLead: 'Dr. Priya Sharma',
  teamMembers: [
    {
      id: 'mem_001',
      name: 'Dr. Rahul Menon',
      role: 'Co-Investigator',
      qualification: 'MD (Ayurveda)',
    },
    {
      id: 'mem_002',
      name: 'Dr. Meena Devi',
      role: 'Clinical Research Associate',
      qualification: 'Ph.D. Pharmacognosy',
    },
    {
      id: 'mem_003',
      name: 'Mr. Karthik Raj',
      role: 'Data Manager',
      qualification: 'M.Sc. Biostatistics',
    },
  ],
  memberCount: 3,
  contactNumber: '+91 98765 43210',
  email: 'researchteam@aiia.example',
  assignedTrialId: 'prop_sample_001',
  assignedTrialCode: 'CT-001',
  assignedTrialTitle: 'Clinical Study to Evaluate the Safety and Efficacy of Nimba-Ayurvedic Tablet in Patients with Madhumeha',
  numberOfPatients: 25,
  status: 'Active',
  createdAt: '02-10-2026',
};

let memoryTeams: TrialTeam[] = [INITIAL_SAMPLE_TEAM];

export const getCachedTeams = (): TrialTeam[] => {
  if (typeof window === 'undefined') {
    return memoryTeams;
  }
  try {
    const raw = localStorage.getItem(STORAGE_TEAMS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify([INITIAL_SAMPLE_TEAM]));
      return [INITIAL_SAMPLE_TEAM];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify([INITIAL_SAMPLE_TEAM]));
      return [INITIAL_SAMPLE_TEAM];
    }
    return parsed;
  } catch (err) {
    console.warn('Teams read error, using memory fallback', err);
    return memoryTeams;
  }
};

export const saveCachedTeams = (teams: TrialTeam[]): void => {
  memoryTeams = teams;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(teams));
    } catch (err) {
      console.warn('Failed to save teams to localStorage', err);
    }
  }
};

export const addTeamToCache = (data: CreateTrialTeamData): TrialTeam => {
  const teams = getCachedTeams();

  const code = data.teamId ? data.teamId.trim().toUpperCase() : `TEAM${String(teams.length + 1).padStart(3, '0')}`;

  const newTeam: TrialTeam = {
    id: `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    teamId: code,
    teamName: data.teamName.trim(),
    centreId: data.centreId,
    principalInvestigator: data.principalInvestigator.trim(),
    teamLead: data.teamLead.trim(),
    teamMembers: data.teamMembers || [],
    memberCount: (data.teamMembers || []).length,
    contactNumber: data.contactNumber.trim(),
    email: data.email.trim().toLowerCase(),
    assignedTrialId: data.assignedTrialId,
    numberOfPatients: Number(data.numberOfPatients) || 0,
    status: data.status || 'Active',
    createdAt: '02-10-2026',
  };

  const updated = [newTeam, ...teams];
  saveCachedTeams(updated);
  return newTeam;
};

export const updateTeamInCache = (id: string, data: Partial<CreateTrialTeamData>): TrialTeam => {
  const teams = getCachedTeams();
  const index = teams.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Trial team not found.');
  }

  const current = teams[index];
  const updatedTeam: TrialTeam = {
    ...current,
    ...data,
    memberCount: data.teamMembers ? data.teamMembers.length : current.memberCount,
  };

  teams[index] = updatedTeam;
  saveCachedTeams([...teams]);
  return updatedTeam;
};

export const toggleTeamStatusInCache = (id: string): TrialTeam => {
  const teams = getCachedTeams();
  const target = teams.find((t) => t.id === id);
  if (!target) {
    throw new Error('Team not found.');
  }
  target.status = target.status === 'Active' ? 'Inactive' : 'Active';
  saveCachedTeams([...teams]);
  return target;
};

export const deleteTeamFromCache = (id: string): void => {
  const teams = getCachedTeams();
  const updated = teams.filter((t) => t.id !== id);
  saveCachedTeams(updated);
};
