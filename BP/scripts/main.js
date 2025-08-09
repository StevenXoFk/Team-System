// Author: StevenXoFk <https://github.com/StevenXoFk>
// Project: https://github.com/StevenXoFk/Team-System

import { CommandPermissionLevel, CustomCommandParamType, world, system } from "@minecraft/server";
import { ModalFormData, MessageFormData } from '@minecraft/server-ui'
import { getTeamSystem, isTeamSystemReady } from "./teamManager.js";

const invitation = new Map()
const TIME_INVITE = 30 * 1000

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const teamSystem = getTeamSystem();

        const team = teamSystem?.getPlayerTeam(player);
        player.nameTag = `${team ? `§7[§r${team.name}§r§7]§r ` : ''}${player.name}`;
    }
})

world.beforeEvents.chatSend.subscribe((data) => {
    const player = data.sender;
    data.cancel = true;
    const teamSystem = getTeamSystem();
    const team = teamSystem?.getPlayerTeam(player);
    world.sendMessage(`${team ? `§7[§r${team.name}§r§7]§r ` : ''}§7${player.name} §r: ${data.message}`);
})

world.beforeEvents.playerLeave.subscribe((data) => {
    const teamSystem = getTeamSystem()
    const player = data.player;

    teamSystem.updatePlayerDisplay(player)
})

world.afterEvents.playerJoin.subscribe((data) => {
    const playerName = data.playerName
    findPlayerWithAttps(playerName);
})

system.beforeEvents.startup.subscribe((data) => {
    const cmdReg = data.customCommandRegistry;
    const enumsTeams = ["create", "accept", 'kick', "invite", "leave", 'clear']
    cmdReg.registerEnum('x:enumTeams', enumsTeams)

    const teamCmd = {
        name: 'x:team',
        description: "Command to create, join, among other things for a team",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [
            {
                type: CustomCommandParamType.Enum,
                name: "x:enumTeams",
            }
        ]
    }

    data.customCommandRegistry.registerCommand(teamCmd, (sender, args) => {
        const player = sender.sourceEntity,
            enums = args

        const teamSystem = getTeamSystem()
        if (!teamSystem) {
            player.sendMessage("§cTeam System is not initialized");
            return;
        }

        switch (enums) {
            case enumsTeams[0]: //Create
                if (teamSystem.getPlayerTeam(player) === null) {
                    createTeamForm(player)
                    break;
                }

                player.sendMessage(`§cYou can't create a team because you're already on one`)
                break;

            case enumsTeams[1]: //accept
                const invite = invitation.get(player.name)
                if (!invite) {
                    player.sendMessage(`§cYou can't use this because you're already on a team, or you don't have any invitations to join a team`)
                    break;
                }

                if (Date.now() - invite.time >= (TIME_INVITE)) {
                    player.sendMessage(`§cDo not accept it because the invitation has expired`);
                    invitation.delete(player.name)
                    break;
                }

                const joinTeam = teamSystem.joinTeam(player, invite.team);
                player.sendMessage(joinTeam.retorna ? `§a${joinTeam.msg}` : `§c${joinTeam.msg}`)
                break

            case enumsTeams[2]: //kick
                if (teamSystem.getPlayerTeam(player) === null || (teamSystem.getPlayerTeam(player).leader !== player.id)) {
                    player.sendMessage(`§cYou can't use this`)
                    break;
                }
                kickPlayerForm(player)
                break;

            case enumsTeams[3]: //invite
                if (teamSystem.getPlayerTeam(player) === null || (teamSystem.getPlayerTeam(player).leader !== player.id)) {
                    player.sendMessage(`§cYou can't use this`)
                    break;
                }
                invitePlayersForm(player)
                break;

            case enumsTeams[4]: //leave
                if (teamSystem.getPlayerTeam(player) === null) {
                    player.sendMessage(`§cYou can't use this because you're not on a team`)
                    break;
                }
                let leave = teamSystem.leaveTeam(player);
                player.sendMessage(leave.retorna ? `§a${leave.msg}` : `§c${leave.msg}`)
                break;

            case enumsTeams[5]: //clear
                if (!player.hasTag('admin')) {
                    player.sendMessage(`§cYou can't use this`)
                    break;
                }
                teamSystem.clearAll()
                break;
            default:
                player.sendMessage('§cYou have to use the arguments /team | create | accept | leave | invite | kick |')
                break;
        }
    })
})

function createTeamForm(player) {
    const form = new ModalFormData().title('Create Team')
    const teamSystem = getTeamSystem();

    form.textField('Team name', 'Enter the team name...');
    system.run(() => {
        form.show(player).then(r => {
            if (r.canceled) return;
            const nombre = r.formValues[0]
            let result = teamSystem.createTeam(nombre);
            if (result) {
                teamSystem.joinTeam(player, nombre);
            }
            player.sendMessage(result.retorna ? `§a${result.msg}` : `§c${result.msg}`)
        })
    })
}

function invitePlayersForm(player) {
    const players = []
    const teamSystem = getTeamSystem();
    for (const player1 of world.getAllPlayers()) {
        if (teamSystem.getPlayerTeam(player1) === null) {
            players.push(player1.name)
        }
    }
    if (players.length === 0) {
        player.sendMessage(`§cThere are no players to invite`)
        return;
    }

    const form = new ModalFormData().title('Invite Player');
    form.dropdown('Players', players);

    system.run(() => {
        form.show(player).then(r => {
            if (r.canceled) return;
            const inv = players[r.formValues[0]]
            const playerInv = world.getAllPlayers().find(p => p.name === inv)
            invitation.set(inv, {
                team: teamSystem.getPlayerTeam(player).name,
                time: Date.now()
            })
            player.sendMessage(`§aYou invited §e ${inv}§a to the team`)
            playerInv.sendMessage(`§aThe player §e${player.name}§a invited you to the§e ${teamSystem.getPlayerTeam(player).name}§a team, you have §e30 seconds§a to accept use§e /team accept`)
        })
    })
}

function kickPlayerForm(player) {
    const teamSystem = getTeamSystem();
    const team = teamSystem.getPlayerTeam(player);

    const miembrosIds = Array.from(team.members.keys())
        .filter(id => id !== player.id);

    if (miembrosIds.length === 0) {
        player.sendMessage("§cThere are no members to kick.");
        return;
    }

    const miembrosNombres = miembrosIds.map(id => {
        const memberPlayer = world.getAllPlayers().find(p => p.id === id);
        return memberPlayer ? memberPlayer.name : team.members.get(id);
    });

    const form = new ModalFormData()
        .title('Kick Player')
        .dropdown('Select a player', miembrosNombres);

    system.run(() => {
        form.show(player).then(r => {
            if (r.canceled) return;

            const selectedId = miembrosIds[r.formValues[0]];
            const resultado = teamSystem.kickFromTeam(selectedId, team.name);
            player.sendMessage(resultado.retorna ? `§a${resultado.msg}` : `§c${resultado.msg}`);
        });
    });
}

function findPlayerWithAttps(name, attps = 0, maxAttps = 100) {
    const player = world.getAllPlayers().find(p => p.name === name);

    if (player) {
        console.warn(`Player ${player.name} found in attempt ${attps + 1}`);

        const teamSystem = getTeamSystem();
        if (teamSystem) {
            teamSystem.onJoinPlayer(player);
        }
        return;
    }
    if (attps < maxAttps) {
        system.runTimeout(() => {
            findPlayerWithAttps(name, attps + 1, maxAttps);
        }, 5);
    } else {
        console.warn(`§cThe player §7${name}§c could not be found after §7${maxAttps}§c attempts`);
    }
}