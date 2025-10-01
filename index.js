import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Lưu thời gian đang ngồi trong voice
let sessions = new Map(); // { userId: { start, channel } }
// Lưu tổng thời gian đã ngồi trong ngày
let totalTimes = new Map(); // { userId: minutes }

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
});

// Hàm cộng dồn thời gian
function addDuration(userId) {
  if (sessions.has(userId)) {
    const joinData = sessions.get(userId);
    const duration = Math.floor((Date.now() - joinData.start) / 1000 / 60); // phút
    totalTimes.set(userId, (totalTimes.get(userId) || 0) + duration);
    sessions.delete(userId);
    return duration;
  }
  return 0;
}

// Theo dõi voice activity
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member) return;
  const userId = member.user.id;
  const username = member.user.username;

  // JOIN
  if (!oldState.channelId && newState.channelId) {
    sessions.set(userId, { start: Date.now(), channel: newState.channel.name });
    console.log(`🎧 ${username} join ${newState.channel.name}`);
  }
  // LEAVE
  else if (oldState.channelId && !newState.channelId) {
    const dur = addDuration(userId);
    console.log(`🚪 ${username} leave ${oldState.channel.name} (+${dur} phút)`);
  }
  // MOVE
  else if (
    oldState.channelId &&
    newState.channelId &&
    oldState.channelId !== newState.channelId
  ) {
    const dur = addDuration(userId);
    console.log(
      `🔄 ${username} move from ${oldState.channel.name} to ${newState.channel.name} (+${dur} phút)`
    );
    sessions.set(userId, { start: Date.now(), channel: newState.channel.name });
  }
});

// Command xử lý
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // Ping test
  if (message.content === "!ping") {
    return message.reply("🏓 Pong!");
  }

// Thống kê thời gian theo role
if (message.content === "!status") {
  if (totalTimes.size === 0 && sessions.size === 0) {
    return message.channel.send("📭 Hôm nay chưa có ai tham gia voice channel.");
  }

  const guild = message.guild;
  await guild.members.fetch(); // load toàn bộ member

  const roles = ["F3", "F4", "F6", "F7"];
  let result = "📊 **Thống kê hôm nay (theo Role):**\n";

  // Cộng thêm thời gian của những người đang ngồi
  for (const [id, data] of sessions.entries()) {
    const extra = Math.floor((Date.now() - data.start) / 1000 / 60);
    totalTimes.set(id, (totalTimes.get(id) || 0) + extra);
    sessions.set(id, { start: Date.now(), channel: data.channel });
  }

  // Duyệt qua từng role
  for (const roleName of roles) {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      result += `\n❌ Không tìm thấy role **${roleName}**\n`;
      continue;
    }

    let membersData = [];
    for (const member of role.members.values()) {
      const minutes = totalTimes.get(member.id) || 0;
      membersData.push(`- <@${member.id}>: \`${minutes} phút\``);
    }

    result += `\n**${roleName}** (${membersData.length}):\n`;
    result += membersData.length > 0 ? membersData.join("\n") : "👉 Trống\n";
  }

  message.channel.send(result);
}

});

// Reset dữ liệu mỗi ngày (0h)
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    totalTimes.clear();
    sessions.clear();
    console.log("🔄 Reset dữ liệu thống kê cho ngày mới");
  }
}, 60 * 1000);

client.login(process.env.TOKEN);
