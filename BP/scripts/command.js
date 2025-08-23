import { system, CustomCommandParamType, } from "@minecraft/server";
export class CustomCommandBuilder {
    constructor(name) {
        this.cmd = {
            name: "",
            description: "",
            permissionLevel: 0,
            cheatsRequired: false,
            mandatoryParameters: [],
            optionalParameters: [],
        };
        this.cmd.name = name;
    }
    description(text) {
        this.cmd.description = text;
        return this;
    }
    permission(level) {
        this.cmd.permissionLevel = level;
        return this;
    }
    cheatsRequired(required = true) {
        this.cmd.cheatsRequired = required;
        return this;
    }
    // Tipos básicos
    string(name, required = false) {
        this.addParam(name, CustomCommandParamType.String, required);
        return this;
    }
    integer(name, required = false) {
        this.addParam(name, CustomCommandParamType.Integer, required);
        return this;
    }
    float(name, required = false) {
        this.addParam(name, CustomCommandParamType.Float, required);
        return this;
    }
    boolean(name, required = false) {
        this.addParam(name, CustomCommandParamType.Boolean, required);
        return this;
    }
    enum(name, values, required = false) {
        this.addParam(name, CustomCommandParamType.Enum, required, values);
        return this;
    }
    entity(name, required = false) {
        this.addParam(name, CustomCommandParamType.EntityType, required);
        return this;
    }
    player(name, required = false) {
        this.addParam(name, CustomCommandParamType.PlayerSelector, required);
        return this;
    }
    position(name, required = false) {
        this.addParam(name, CustomCommandParamType.Location, required);
        return this;
    }
    blockType(name, required = false) {
        this.addParam(name, CustomCommandParamType.BlockType, required);
        return this;
    }
    itemType(name, required = false) {
        this.addParam(name, CustomCommandParamType.ItemType, required);
        return this;
    }
    onExecute(fn) {
        this.handler = fn;
        return this;
    }
    addParam(name, type, required, values) {
        let list = required
            ? this.cmd.mandatoryParameters
            : this.cmd.optionalParameters;
        if (!list) {
            list = [];
            if (required) {
                this.cmd.mandatoryParameters = list;
            }
            else {
                this.cmd.optionalParameters = list;
            }
        }
        const param = { name, type, values };
        if (values)
            param.values = values;
        list.push(param);
    }
    register(registry) {
        var _a, _b;
        const full = this.cmd;
        for (const param of [
            ...((_a = full.mandatoryParameters) !== null && _a !== void 0 ? _a : []),
            ...((_b = full.optionalParameters) !== null && _b !== void 0 ? _b : []),
        ]) {
            if (param.type == CustomCommandParamType.Enum) {
                registry.registerEnum(param.name, param["values"]);
            }
        }
        registry.registerCommand(full, this.handler);
        let handlers = SlashCommandManager.constructor.handlers;
        if (!handlers) {
            SlashCommandManager.constructor.handlers = new Map();
            handlers = SlashCommandManager.constructor.handlers;
        }
        handlers.set(full.name, this);
    }
}
class _SlashCommandManager {
    constructor() {
        this.builders = [];
        system.beforeEvents.startup.subscribe((ev) => {
            this.registry = ev.customCommandRegistry;
            for (const b of this.builders)
                b.register(this.registry);
        });
    }
    create(name) {
        const builder = new CustomCommandBuilder(name);
        this.builders.push(builder);
        return builder;
    }
}
export const SlashCommandManager = new _SlashCommandManager();
//# sourceMappingURL=main.js.map