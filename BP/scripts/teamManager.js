import { world } from '@minecraft/server';
import { Teams } from './team.js';

// Private variable to store the instance
let _teamSystem = null;

// Function to obtain the team system instance
export function getTeamSystem() {
    return _teamSystem;
}

// Function to check if the teamSystem is ready
export function isTeamSystemReady() {
    return _teamSystem !== null;
}

// Function to initialize the team system
export function initializeTeamSystem() {
    if (!_teamSystem) {
        _teamSystem = new Teams();
        console.warn("§aTeam System initialized correctly");
    }
    return _teamSystem;
}


// Initialize when the world loads
world.afterEvents.worldLoad.subscribe(() => {
    console.warn(`§aTeam System Version §e1.0`)
    initializeTeamSystem();
});