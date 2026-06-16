const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Objeto para armazenar os timers ativos de cada canal
const activeTimers = new Map();

client.on("voiceStateUpdate", (oldState, newState) => {
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  // --- CENÁRIO 1: Alguém SAIU ou MUDOU de canal ---
  if (oldChannel && oldChannel.id !== newChannel?.id) {
    // Se sobrou exatamente 1 membro humano na sala antiga
    const humanMembers = oldChannel.members.filter(
      (member) => !member.user.bot,
    );

    if (humanMembers.size === 1) {
      const lastMember = humanMembers.first();
      const channelId = oldChannel.id;

      // Se já não houver um timer rodando para esse canal, inicia um
      if (!activeTimers.has(channelId)) {
        console.log(
          `[Timer Iniciado] ${lastMember.user.tag} ficou sozinho no canal ${oldChannel.name}. Expulsão em 5 min.`,
        );

        const timeoutId = setTimeout(
          async () => {
            try {
              // Força a atualização do canal para garantir que a pessoa ainda está lá sozinha
              const currentChannel = await client.channels.fetch(channelId);
              const currentHumans = currentChannel.members.filter(
                (m) => !m.user.bot,
              );

              if (
                currentHumans.size === 1 &&
                currentHumans.has(lastMember.id)
              ) {
                await lastMember.voice.disconnect(
                  "Ficou sozinho na sala por mais de 5 minutos.",
                );
                console.log(
                  `[Expulso] ${lastMember.user.tag} foi desconectado por inatividade.`,
                );
              }
            } catch (error) {
              console.error("Erro ao tentar desconectar usuário:", error);
            } finally {
              activeTimers.delete(channelId); // Limpa o mapa após a execução
            }
          },
          5 * 60 * 1000,
        ); // 5 minutos em milissegundos

        activeTimers.set(channelId, timeoutId);
      }
    }
  }

  // --- CENÁRIO 2: Alguém ENTROU em um canal ---
  if (newChannel && oldChannel?.id !== newChannel.id) {
    const channelId = newChannel.id;
    const humanMembers = newChannel.members.filter(
      (member) => !member.user.bot,
    );

    // Se o canal tinha um timer rodando e agora tem mais de 1 pessoa, cancela o timer
    if (humanMembers.size > 1 && activeTimers.has(channelId)) {
      console.log(
        `[Timer Cancelado] Alguém entrou no canal ${newChannel.name}. Usuário salvo.`,
      );
      clearTimeout(activeTimers.get(channelId));
      activeTimers.delete(channelId);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
