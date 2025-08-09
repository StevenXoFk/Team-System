import { CommandPermissionLevel, CustomCommandParamType, world, system } from "@minecraft/server";
import { ModalFormData, MessageFormData } from '@minecraft/server-ui'
import { getTeamSystem, isTeamSystemReady } from "./teamManager.js";

const invitation = new Map()
const TIME_INVITE = 30 * 1000

world.beforeEvents.playerLeave.subscribe((data) => {
    const teamSystem = getTeamSystem()
    const player = data.player;

    teamSystem.updatePlayerDisplay(player)
})


system.beforeEvents.startup.subscribe((data) => {
    const cmdReg = data.customCommandRegistry;
    const enumsTeams = ["create", "accept", 'kick', "invite", "leave", 'clear']
    cmdReg.registerEnum('x:enumTeams', enumsTeams)

    const teamCmd = {
        name: 'x:team',
        description: "equipos",
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
            player.sendMessage("§cTeam System no está inicializado");
            return;
        }

        switch (enums) {
            case enumsTeams[0]: //Create
                if (teamSystem.getPlayerTeam(player) === null) {
                    createTeamForm(player)
                    break;
                }

                player.sendMessage(`§cNo puedes crear un equipo debido a que ya estas en uno`)
                break;

            case enumsTeams[1]: //accept
                const invite = invitation.get(player.name)
                if (!invite) {
                    player.sendMessage(`§cNo puedes usar esto debido a que ya estas en uno, o no tienes ninguna invitacion lol`)
                    break;
                }

                if (Date.now() - invite.time >= (TIME_INVITE)) {
                    player.sendMessage(`§cNo aceptarlo debido a que la invitacion expiró`);
                    invitation.delete(player.name)
                    break;
                }

                const joinTeam = teamSystem.joinTeam(player, invite.team);
                player.sendMessage(joinTeam.retorna ? `§a${joinTeam.msg}` : `§c${joinTeam.msg}`)
                break

            case enumsTeams[2]: //kick
                if (teamSystem.getPlayerTeam(player) === null || (teamSystem.getPlayerTeam(player).leader !== player.id)) {
                    player.sendMessage(`§cNo puedes usar esto`)
                    break;
                }
                kickPlayerForm(player)
                break;

            case enumsTeams[3]: //invite
                if (teamSystem.getPlayerTeam(player) === null || (teamSystem.getPlayerTeam(player).leader !== player.id)) {
                    player.sendMessage(`§cNo puedes usar esto`)
                    break;
                }
                invitePlayersForm(player)
                break;

            case enumsTeams[4]: //leave
                if (teamSystem.getPlayerTeam(player) === null) {
                    player.sendMessage(`§cNo puedes usar esto debido a que no estas en un equipo`)
                    break;
                }
                let leave = teamSystem.leaveTeam(player);
                player.sendMessage(leave.retorna ? `§a${leave.msg}` : `§c${leave.msg}`)
                break;

            case enumsTeams[5]: //clear
                if (!player.hasTag('admin')) {
                    player.sendMessage(`§cNo puedes usar esto`)
                    break;
                }
                teamSystem.clearAll()
                break;
            default:
                player.sendMessage('§cTienes que usar los argumentos /team | create | accept | leave | invite | kick |')
                break;
        }
    })
})

function createTeamForm(player) {
    const form = new ModalFormData().title('Crear Equipo')
    const teamSystem = getTeamSystem();

    form.textField('Nombre del Equipo', 'Ingresa el nombre...');
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
        player.sendMessage(`§cNo hay jugadores para invitar`)
        return;
    }

    const form = new ModalFormData().title('Invitar Jugador');
    form.dropdown('Jugador', players);

    system.run(() => {
        form.show(player).then(r => {
            if (r.canceled) return;
            const inv = players[r.formValues[0]]
            const playerInv = world.getAllPlayers().find(p => p.name === inv)
            invitation.set(inv, {
                team: teamSystem.getPlayerTeam(player).name,
                time: Date.now()
            })
            player.sendMessage(`§aInvitastes a§e ${inv}§a al equipo`)
            playerInv.sendMessage(`§aEl jugador §e${player.name}§a te invitó al equipo§e ${teamSystem.getPlayerTeam(player).name}§a, tienes §e30 segundos§a para aceptar usa§e /team accept`)
        })
    })
}

function kickPlayerForm(player) {
    const teamSystem = getTeamSystem();
    const team = teamSystem.getPlayerTeam(player);

    const miembrosIds = Array.from(team.members.keys())
        .filter(id => id !== player.id);

    if (miembrosIds.length === 0) {
        player.sendMessage("§cNo hay miembros para expulsar.");
        return;
    }

    const miembrosNombres = miembrosIds.map(id => {
        const memberPlayer = world.getAllPlayers().find(p => p.id === id);
        return memberPlayer ? memberPlayer.name : team.members.get(id);
    });

    const form = new ModalFormData()
        .title('Expulsar Jugador')
        .dropdown('Selecciona un jugador', miembrosNombres);

    system.run(() => {
        form.show(player).then(r => {
            if (r.canceled) return;

            const selectedId = miembrosIds[r.formValues[0]];
            const resultado = teamSystem.kickFromTeam(selectedId, team.name);
            player.sendMessage(resultado.retorna ? `§a${resultado.msg}` : `§c${resultado.msg}`);
        });
    });
}