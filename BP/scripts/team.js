// Author: StevenXoFk <https://github.com/StevenXoFk>
// Project: https://github.com/StevenXoFk/Team-System

import { world, system } from '@minecraft/server'

export class Teams {
    constructor() {
        this.teams = new Map();
        this.playersTeam = new Map();
        this.isDirty = false;

        this.loadTeams();
        this.startAutoSave();
    }

    loadTeams() {
        try {
            const teamsData = world.getDynamicProperty('team:teams')

            if (teamsData) {
                const teams = JSON.parse(teamsData)
                for (const teamData of teams) {
                    this.teams.set(teamData.name, {
                        name: teamData.name,
                        members: new Map(teamData.members || []),
                        leader: teamData.leader,
                        date: teamData.date
                    });
                }
            }

            const playerTeamsData = world.getDynamicProperty('team:players');
            if (playerTeamsData) {
                const playerTeams = JSON.parse(playerTeamsData)
                for (const [playerId, teamName] of playerTeams) {
                    this.playersTeam.set(playerId, teamName)
                }
            }
            console.warn(`§a[Team] Team System: Load ${this.teams.size} teams`);
        } catch (e) {
            console.warn('§c[Team] Error loading team system data:', e);
        }
    }

    saveTeams() {
        if (!this.isDirty) return;

        try {
            const teamsArray = []
            for (const [name, team] of this.teams) {
                teamsArray.push({
                    name: team.name,
                    members: Array.from(team.members.entries()),
                    leader: team.leader,
                    date: team.date
                })
            }
            world.setDynamicProperty('team:teams', JSON.stringify(teamsArray));

            const playerTeamsArray = Array.from(this.playersTeam.entries())
            world.setDynamicProperty('team:players', JSON.stringify(playerTeamsArray));
            this.isDirty = false;
        } catch (e) {
            console.error('[Team] Error saving team system data:', e);
        }
    }

    startAutoSave() {
        system.runInterval(() => {
            this.saveTeams();
            console.warn('teams save')
        }, 600)
    }

    clearAll() {
        world.setDynamicProperty('team:teams', undefined)
        world.setDynamicProperty('team:players', undefined)

        this.teams.clear()
        this.playersTeam.clear()
        console.warn('§c[Team] All team system data has been cleaned');
    }

    createTeam(teamName) {
        if (!teamName || teamName.trim().length === 0) {
            return { retorna: false, msg: '[Team] The team name cannot be empty' }
        }

        if (teamName.length > 16) {
            return { retorna: false, msg: '[Team] The teams name is too long (max 16 characters)' }
        }

        if (this.teams.has(teamName)) {
            return { retorna: false, msg: '[Team] The team already exists' }
        }

        this.teams.set(teamName, {
            name: teamName,
            members: new Map(),
            leader: null,
            date: Date.now()
        });

        this.isDirty = true;
        return { retorna: true, msg: `[Team] Team ${teamName} successfully created` }
    }

    deleteTeam(teamName) {
        if (!this.teams.has(teamName)) {
            return { retorna: false, msg: "[Team] The team does not exist" }
        }

        const team = this.teams.get(teamName)

        for (const playerId of team.members.keys()) {
            this.playersTeam.delete(playerId);
            const player = world.getAllPlayers().find(p => p.id === playerId);

            if (player) {
                this.updatePlayerDisplay(player)
            }
        }
        this.teams.delete(teamName)

        this.saveTeams();
        return { retorna: true, msg: `[Team] Team ${teamName} deleted` }
    }

    joinTeam(player, teamName) {
        if (!this.teams.has(teamName)) {
            return { retorna: false, msg: "[Team] The team does not exist" };
        }

        const currentTeam = this.playersTeam.get(player.id);
        if (currentTeam) {
            return { retorna: false, msg: `[Team] You're already on the ${currentTeam} team` };
        }

        const team = this.teams.get(teamName)
        team.members.set(player.id, player.name);
        this.playersTeam.set(player.id, teamName);

        if (team.members.size === 1) {
            team.leader = player.id
        }

        this.updatePlayerDisplay(player);
        this.isDirty = true;

        return { retorna: true, msg: `[Team] You joined team ${teamName}` };
    }

    leaveTeam(player) {
        const actualTeam = this.playersTeam.get(player.id);
        if (!actualTeam) return { retorna: false, msg: "[Team] You are not on any team" };

        const team = this.teams.get(actualTeam);
        if (!team) return { retorna: false, msg: "[Team] The team does not exist" };

        team.members.delete(player.id);
        this.playersTeam.delete(player.id);

        // Si era el líder, asigna uno nuevo si quedan miembros
        if (team.leader === player.id && team.members.size > 0) {
            team.leader = team.members.keys().next().value;
        }

        this.updatePlayerDisplay(player)
        // Si el equipo queda vacío, elimínalo
        if (team.members.size === 0) {
            this.teams.delete(actualTeam);
        }

        this.saveTeams();
        return { retorna: true, msg: `[Team] You left the team ${actualTeam}` };
    }

    getPlayerTeam(player) {
        const teamName = this.playersTeam.get(player.id);
        return teamName ? this.teams.get(teamName) : null;
    }

    getMembersTeam(teamName) {
        const team = this.teams.get(teamName);
        if (!team) return []

        return Array.from(team.members.keys());
    }

    isTeam(player1, player2) {
        const team1 = this.playersTeam.get(player1.id);
        const team2 = this.playersTeam.get(player2.id);

        return team1 && team2 && team1 === team2;
    }

    kickFromTeam(playerId, teamName) {
        const team = this.teams.get(teamName);
        if (!team) return { retorna: false, msg: "[Team] The team does not exist" };
        if (!team.members.has(playerId)) return { retorna: false, msg: "The player is not on the team" };

        team.members.delete(playerId);
        this.playersTeam.delete(playerId);

        // Si era el líder, asigna uno nuevo si quedan miembros
        if (team.leader === playerId && team.members.size > 0) {
            team.leader = team.members.keys().next().value;
        }

        // Si el equipo queda vacío, elimínalo
        if (team.members.size === 0) {
            this.teams.delete(teamName);
        }

        this.saveTeams();
        return { retorna: true, msg: `Player expelled from the ${teamName} team` };
    }

    updatePlayerDisplay(player) {
        system.run(() => {
            const team = this.getPlayerTeam(player);

            const tags = player.getTags();
            for (const tag of tags) {
                if (tag.startsWith('team_')) {
                    player.removeTag(tag);
                }
            }

            if (team) {
                const sanitizedName = team.name.replace(/[^a-zA-Z0-9_]/g, '_');
                player.addTag(`team_${sanitizedName}`);
            }
        })
    }

    onJoinPlayer(player) {
        system.runTimeout(() => {
            const teamName = this.playersTeam.get(player.id);
            if (teamName && this.teams.has(teamName)) {
                const team = this.teams.get(teamName);
                this.updatePlayerDisplay(player)
            }
        }, 40)
    }

    onLeavePlayer(player) {
        this.updatePlayerDisplay(player)
    }
}