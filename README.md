# Team-System

# Description / Descripción

## ENGLISH
This addon for Minecraft Bedrock 1.21.100 adds an advanced team system to the game. It allows you to create, manage and administer teams of players using scripts, making it easier for add-on developers to instantiate teams to their games.

## SPANISH

Este complemento para Minecraft Bedrock 1.21.100 agrega un sistema de equipo avanzado al juego. Le permite crear, administrar y administrar equipos de jugadores mediante scripts, lo que facilita que los desarrolladores de complementos creen instancias de equipos en sus juegos.

# How it works / Como funciona

## ENGLISH
This addon works through a class called Teams which will be storing all the equipment information in maps, and then converts them into a string to store it in the DynamicProperty of the world. This addon will be automatically saving every 600 ticks (30 seconds).

Additionally, in order to use it in any script path, it is recommended to import the import { getTeamSystem} from "./teamManager.js"; to access your data.

## SPANISH

Este complemento funciona a través de una clase llamada Teams que almacenará toda la información del equipo en mapas y luego los convertirá en una cadena para almacenarla en DynamicProperty del mundo. Este complemento se guardará automáticamente cada 600 ticks (30 segundos).

Además, para poder usarlo en cualquier ruta de script, se recomienda importar import { getTeamSystem} desde "./teamManager.js"; para acceder a sus datos.

# Commands:

- `/team create`: option to create a team (The team name must be a minimum of 1 character and a maximum of 12) // Opción para crear un equipo (El nombre del equipo debe ser un mínimo de 1 carácter y un máximo de 12)

- `/team accept`: This option allows you to accept the invitation of a player who has invited you, this invitation expires after 30 seconds. It can be edited using the TIME_INVITE constant // Esta opción te permite aceptar la invitación de un jugador que te ha invitado, esta invitación caduca después de 30 segundos. Se puede editar utilizando la constante TIME_INVITE

- `/team leave`: It allows you to leave the team you are currently on // Te permite dejar el equipo en el que estás actualmente

- `/team kick`: This option allows you to kick a player who is on the team (only team leaders can use it) // Esta opción te permite patear a un jugador que está en el equipo (solo los líderes del equipo pueden usarla)

- `/team invite`: This option allows you to invite a player who is not on any team, this player will then have to accept to join the team // Esta opción te permite invitar a un jugador que no está en ningún equipo, este jugador tendrá que aceptar unirse al equipo

- `/team clear`: This option is important for administrators to clean all existing teams. To use it you have to use the 'admin' tag // Esta opción es importante para que los administradores limpien todos los equipos existentes. Para usarlo tienes que usar la etiqueta 'admin'