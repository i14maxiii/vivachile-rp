require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;

const commands = [
  new SlashCommandBuilder()
    .setName('creardni')
    .setDescription('Crear tu cédula de identidad')
    .addStringOption(option => option.setName('nombre').setDescription('Tu nombre').setRequired(true))
    .addStringOption(option => option.setName('apellido').setDescription('Tu apellido').setRequired(true))
    .addStringOption(option => option.setName('nacionalidad').setDescription('Tu nacionalidad').setRequired(true))
    .addStringOption(option => option.setName('sexo').setDescription('Tu sexo').setRequired(true))
    .addStringOption(option => option.setName('fecha_nacimiento').setDescription('Fecha de nacimiento').setRequired(true))
    .addStringOption(option => option.setName('roblox').setDescription('ID o URL del usuario Roblox').setRequired(true)) // si quieres que roblox sea opcional
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
