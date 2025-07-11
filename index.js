require('dotenv').config(); // carga las variables de .env automáticamente

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

console.log("Token:", token ? "Cargado" : "No definido");
console.log("Client ID:", clientId ? "Cargado" : "No definido");
console.log("Guild ID:", guildId ? "Cargado" : "No definido");

// Aquí sigue tu código usando esas variables

const { Client, GatewayIntentBits, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// Roles para permisos
const ROLE_ID_ALLOWED = "1392898072132059187"; // permiso para eliminar cédulas
const ROLE_ID_SECOND_DNI = "1392915676682911834"; // permiso para crear segunda cédula

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const dbPath = path.join(__dirname, "database.json");

function readDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "{}");
  }
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Función para generar número de documento (ejemplo: 467.829.293)
function generarNumeroDocumento() {
  const numero = Math.floor(Math.random() * 1_000_000_000); // entre 0 y 999,999,999
  const strNum = numero.toString().padStart(9, '0'); // rellenar con ceros a la izquierda
  return `${strNum.slice(0,3)}.${strNum.slice(3,6)}.${strNum.slice(6,9)}`;
}

// Función para formatear fecha a DD/MM/YYYY
function formatearFecha(fecha) {
  const d = fecha.getDate().toString().padStart(2, '0');
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

client.once(Events.ClientReady, () => {
  console.log(`Bot listo como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "creardni") {
    const userId = interaction.user.id;
    const member = interaction.member;

    const nombre = interaction.options.getString("nombre");
    const apellido = interaction.options.getString("apellido");
    const nacionalidad = interaction.options.getString("nacionalidad");
    const sexo = interaction.options.getString("sexo");
    const fecha_nacimiento = interaction.options.getString("fecha_nacimiento");
    let robloxInput = interaction.options.getString("roblox")?.trim();

    const db = readDB();

    const tienePrimeraCedula = !!db[userId]?.primeraCedula;
    const tieneSegundaCedula = !!db[userId]?.segundaCedula;

    // Generar valores automáticos
    const numeroDocumento = generarNumeroDocumento();
    const fechaEmision = formatearFecha(new Date());
    const fechaVencimiento = formatearFecha(new Date(new Date().setFullYear(new Date().getFullYear() + 5)));

    if (!tienePrimeraCedula) {
      if (!robloxInput) {
        await interaction.reply({ content: "Por favor, proporciona un ID o URL válido de Roblox para la primera cédula.", flags: 1 << 6 });
        return;
      }

      const idMatch = robloxInput.match(/(\d+)/);
      if (!idMatch) {
        await interaction.reply({ content: "No se pudo extraer un ID válido. Ingresa el ID o URL del perfil Roblox.", flags: 1 << 6 });
        return;
      }
      const robloxId = idMatch[1];

      try {
        const response = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
        const data = await response.json();

        if (data.errors) {
          await interaction.reply({ content: `No se encontró un usuario Roblox con el ID "${robloxId}".`, flags: 1 << 6 });
          return;
        }

        const robloxUsername = data.name || data.Username || "Desconocido";

        db[userId] = {
          primeraCedula: {
            nombre,
            apellido,
            nacionalidad,
            sexo,
            fecha_nacimiento,
            numero_documento: numeroDocumento,
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            roblox: {
              Id: parseInt(robloxId),
              Username: robloxUsername
            }
          },
          segundaCedula: null
        };

        writeDB(db);

        await interaction.reply({ content: "¡Tu Primera Cédula ha sido creada con éxito! Usa `cl!dni` para verla.", flags: 1 << 6 });

      } catch (error) {
        console.error("Error al consultar Roblox API:", error);
        await interaction.reply({ content: "Error al validar el usuario Roblox. Intenta más tarde.", flags: 1 << 6 });
      }

      return;
    }

    // Segunda cédula solo con permiso
    if (!member.roles.cache.has(ROLE_ID_SECOND_DNI)) {
      await interaction.reply({ content: "No tienes permiso para crear una segunda cédula.", flags: 1 << 6 });
      return;
    }

    if (tieneSegundaCedula) {
      await interaction.reply({ content: "¡Espera! Ya registraste tu primera y segunda Cédula de Identidad", flags: 1 << 6 });
      return;
    }

    db[userId].segundaCedula = {
      nombre,
      apellido,
      nacionalidad,
      sexo,
      fecha_nacimiento,
      numero_documento: generarNumeroDocumento(),
      fecha_emision: formatearFecha(new Date()),
      fecha_vencimiento: formatearFecha(new Date(new Date().setFullYear(new Date().getFullYear() + 5))),
      roblox: db[userId].primeraCedula.roblox
    };

    writeDB(db);

    await interaction.reply({ content: "¡Tu Segunda Cédula ha sido creada con éxito! Usa `cl!dni 2` para verla.", flags: 1 << 6 });
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  console.log(`Mensaje recibido de ${message.author.tag}: ${message.content}`);

  const content = message.content.trim();

  if (content.toLowerCase().startsWith("cl!dni")) {
    const args = content.split(/ +/).slice(1);
    const mentionedUser = message.mentions.users.first();

    if (
      args.length > 2 ||
      (args.length === 1 && !["2"].includes(args[0]) && !mentionedUser) ||
      (args.length === 2 && !(args[0] === "2" && mentionedUser))
    ) {
      return message.reply(
        "❌ Comando inválido. Usa:\n" +
        "`cl!dni`\n" +
        "`cl!dni 2`\n" +
        "`cl!dni @usuario`\n" +
        "`cl!dni 2 @usuario`\n" +
        "No coloques nada más."
      );
    }

    let userId;
    let opcion = null;

    if (args.length === 0) {
      userId = message.author.id;
    } else if (args.length === 1) {
      if (args[0] === "2") {
        userId = message.author.id;
        opcion = "2";
      } else if (mentionedUser) {
        userId = mentionedUser.id;
      }
    } else if (args.length === 2) {
      userId = mentionedUser.id;
      opcion = "2";
    }

    const db = readDB();

    if (!db[userId]) {
      return message.reply(
        userId === message.author.id
          ? "❌ No tienes una cédula registrada. Usa `/creardni` para crear una."
          : `❌ El usuario ${mentionedUser.username} no tiene una cédula registrada.`
      );
    }

    let dni = null;

    if (opcion === "2") {
      dni = db[userId].segundaCedula;
      if (!dni) {
        return message.reply("❌ No tiene una segunda cédula registrada.");
      }
    } else {
      dni = db[userId].primeraCedula;
      if (!dni) {
        dni = db[userId].segundaCedula;
        if (!dni) {
          return message.reply("❌ No tiene una cédula válida registrada.");
        }
      }
    }

    let robloxAvatarUrl = null;

    if (dni.roblox?.Id && !isNaN(dni.roblox.Id)) {
      try {
        const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${dni.roblox.Id}&size=420x420&format=Png&isCircular=false`);
        const json = await res.json();
        if (json?.data?.[0]?.imageUrl) {
          robloxAvatarUrl = json.data[0].imageUrl;
        }
      } catch (err) {
        console.error("Error al obtener avatar de Roblox:", err);
      }
    }

    const flagEmojis = {
      "chilena": "🇨🇱",
      "argentina": "🇦🇷",
      "mexicana": "🇲🇽",
      "española": "🇪🇸",
      "colombiana": "🇨🇴",
      "venezolana": "🇻🇪",
      "peruana": "🇵🇪",
      "uruguaya": "🇺🇾",
      "boliviana": "🇧🇴",
      "paraguaya": "🇵🇾",
      "ecuatoriana": "🇪🇨"
    };

    const nacionalidadLower = dni.nacionalidad?.toLowerCase() || "";
    const bandera = flagEmojis[nacionalidadLower] || "🌍";

    const embed = {
      color: 0x00b0f4,
      title: "🪪 Carnet de Identidad",
      thumbnail: robloxAvatarUrl ? { url: robloxAvatarUrl } : undefined,
      fields: [
        { name: "🆔 N° Documento", value: dni.numero_documento || "Desconocido", inline: true },
        { name: "🧑 Nombre", value: dni.nombre, inline: true },
        { name: "👨‍👩‍👧 Apellido", value: dni.apellido, inline: true },
        { name: "🌍 Nacionalidad", value: `${bandera} ${dni.nacionalidad}`, inline: true },
        { name: "⚧️ Sexo", value: dni.sexo, inline: true },
        { name: "🎮 Usuario Roblox", value: dni.roblox?.Username || "¡Inválido!", inline: true },
        { name: "🎂 Fecha de nacimiento", value: dni.fecha_nacimiento, inline: true },
        { name: "📅 Fecha de Emisión", value: dni.fecha_emision || "Desconocida", inline: true },
        { name: "📅 Fecha de Vencimiento", value: dni.fecha_vencimiento || "Desconocida", inline: true }
        
      ],
      footer: {
        text: `📝 Cédula de identidad de ${mentionedUser ? mentionedUser.username : message.author.username}`,
        icon_url: (mentionedUser || message.author).displayAvatarURL()
      },
      timestamp: new Date()
    };

    console.log(`Enviando embed para usuario ${userId} con opción ${opcion || "1"}`);

    await message.channel.send({ embeds: [embed] });
    return; // evita posibles dobles envíos
  }

  // Comando para eliminar cédulas
  if (content.toLowerCase().startsWith("cl!eliminar cedula")) {
    const args = content.split(/ +/).slice(2); // ["1", "@usuario"]
    const member = message.member;
    const mentionedUser = message.mentions.users.first();

    if (args.length !== 2 || !["1", "2"].includes(args[0]) || !mentionedUser) {
      return message.reply(
        "❌ Comando inválido.\nUsa:\n`cl!eliminar cedula 1 @usuario` para eliminar la primera cédula\n`cl!eliminar cedula 2 @usuario` para eliminar la segunda cédula"
      );
    }

    const tipoCedula = args[0]; // "1" o "2"

    if (mentionedUser.id === message.author.id && !member.roles.cache.has(ROLE_ID_ALLOWED)) {
      return message.reply("❌ No tienes permiso para eliminar tu propia cédula con este comando.");
    }

    const db = readDB();

    if (!db[mentionedUser.id]) {
      return message.reply(`❌ El usuario ${mentionedUser.username} no tiene una cédula registrada.`);
    }

    if (tipoCedula === "1") {
      if (!db[mentionedUser.id].primeraCedula) {
        return message.reply(`❌ ${mentionedUser.username} no tiene una primera cédula registrada.`);
      }

      db[mentionedUser.id].primeraCedula = null;

      if (!db[mentionedUser.id].segundaCedula) {
        delete db[mentionedUser.id];
      }

      writeDB(db);
      return message.reply(`✅ La primera cédula de ${mentionedUser.username} ha sido eliminada.`);
    }

    if (tipoCedula === "2") {
      if (!db[mentionedUser.id].segundaCedula) {
        return message.reply(`❌ ${mentionedUser.username} no tiene una segunda cédula registrada.`);
      }

      db[mentionedUser.id].segundaCedula = null;

      if (!db[mentionedUser.id].primeraCedula) {
        delete db[mentionedUser.id];
      }

      writeDB(db);
      return message.reply(`✅ La segunda cédula de ${mentionedUser.username} ha sido eliminada.`);
    }
  }
});

// Login con token
client.login(process.env.DISCORD_TOKEN);

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot activo!');
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
