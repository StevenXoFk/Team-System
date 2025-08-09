import { world } from '@minecraft/server';
import { Teams } from './team.js';

// Variable privada para almacenar la instancia
let _teamSystem = null;

// Función para obtener la instancia del team system
export function getTeamSystem() {
    return _teamSystem;
}

// Función para verificar si está inicializado
export function isTeamSystemReady() {
    return _teamSystem !== null;
}

// Función para inicializar el team system
export function initializeTeamSystem() {
    if (!_teamSystem) {
        _teamSystem = new Teams();
        console.warn("§aTeam System inicializado correctamente");
    }
    return _teamSystem;
}


// Inicializar cuando el mundo se cargue
world.afterEvents.worldLoad.subscribe(() => {
    initializeTeamSystem();
});