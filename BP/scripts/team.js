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
            console.warn(`§aTeam System: Cargados ${this.teams.size} equipos`);
        } catch (e) {
            console.warn('§cError cargando datos del team system:', e);
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
            console.error('Error guardando datos del team system:', e);
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
        console.warn('§cTodos los datos del team system han sido limpiados');
    }

    createTeam(teamName) {
        if (!teamName || teamName.trim().length === 0) {
            return { retorna: false, msg: 'El nombre del equipo no puede estar vacío' }
        }

        if (teamName.length > 16) {
            return { retorna: false, msg: 'El nombre del equipo es demasiado largo (máx 16 caracteres)' }
        }

        if (this.teams.has(teamName)) {
            return { retorna: false, msg: 'El equipo ya existe' }
        }

        this.teams.set(teamName, {
            name: teamName,
            members: new Map(),
            leader: null,
            date: Date.now()
        });

        this.isDirty = true;
        return { retorna: true, msg: `Equipo ${teamName} creado exitosamente` }
    }

    deleteTeam(teamName) {
        if (!this.teams.has(teamName)) {
            return { retorna: false, msg: "El equipo no existe" }
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
        return { retorna: true, msg: `Equipo ${teamName} eliminado` }
    }

    joinTeam(player, teamName) {
        if (!this.teams.has(teamName)) {
            return { retorna: false, msg: "El equipo no existe" };
        }

        const currentTeam = this.playersTeam.get(player.id);
        if (currentTeam) {
            return { retorna: false, msg: `Ya estás en el equipo ${currentTeam}` };
        }

        const team = this.teams.get(teamName)
        team.members.set(player.id, player.name);
        this.playersTeam.set(player.id, teamName);

        if (team.members.size === 1) {
            team.leader = player.id
        }

        this.updatePlayerDisplay(player);
        this.isDirty = true;

        return { retorna: true, msg: `Te uniste al equipo ${teamName}` };
    }

    leaveTeam(player) {
        const actualTeam = this.playersTeam.get(player.id);
        if (!actualTeam) return { retorna: false, msg: "No estás en un equipo" };

        const team = this.teams.get(actualTeam);
        if (!team) return { retorna: false, msg: "El equipo no existe" };

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
        return { retorna: true, msg: `Saliste del equipo ${actualTeam}` };
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
        if (!team) return { retorna: false, msg: "El equipo no existe" };
        if (!team.members.has(playerId)) return { retorna: false, msg: "El jugador no está en el equipo" };

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
        return { retorna: true, msg: `Jugador expulsado del equipo ${teamName}` };
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
        this.saveTeams()
    }
}