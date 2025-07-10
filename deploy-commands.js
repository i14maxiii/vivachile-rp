const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [
  new SlashCommandBuilder()
    .setName('creardni')
    .setDescription('Crear tu cédula de identidad')
    .addStringOption(option => option.setName('nombre').setDescription('Tu nombre').setRequired(true))
    .addStringOption(option => option.setName('apellido').setDescription('Tu apellido').setRequired(true))
    .addStringOption(option => option.setName('nacionalidad').setDescription('Tu nacionalidad').setRequired(true))
    .addStringOption(option => option.setName('sexo').setDescription('Tu sexo').setRequired(true))
    .addStringOption(option => option.setName('fecha_nacimiento').setDescription('Fecha de nacimiento').setRequired(true))
    // Opción única para Roblox (ID o URL)
    .addStringOption(option => option.setName('roblox').setDescription('ID o URL del usuario Roblox').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registrando comandos slash...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('Comandos slash registrados correctamente');
  } catch (error) {
    console.error(error);
  }
})();
