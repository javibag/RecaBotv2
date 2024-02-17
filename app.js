import "dotenv/config";
import bot from "@bot-whatsapp/bot";
import { getDay } from "date-fns";
import QRPortalWeb from "@bot-whatsapp/portal";
import BaileysProvider from "@bot-whatsapp/provider/baileys";
import MockAdapter from "@bot-whatsapp/database/mock";
import chatgpt from "./services/openai/chatgpt.js";
import GoogleSheetService from "./services/sheets/index.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import fs from "fs";

const { EVENTS } = bot;
const { addKeyword } = bot;

const flowRecibirMedia = addKeyword(EVENTS.MEDIA).addAnswer(
  "A ver...",
  null,
  async (ctx, { flowDynamic }) => {
    const buffer = await downloadMediaMessage(ctx, "buffer");
    const numeroWhatsApp = ctx.from;
    const fechaHoraActual = new Date();
    const optionsDate = { year: "numeric", month: "2-digit", day: "2-digit" };
    const fechaActual = fechaHoraActual
      .toLocaleDateString("es-ES", optionsDate)
      .replace(/\//g, "-");
    const optionsHour = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    const horaActual = fechaHoraActual
      .toLocaleTimeString("es-ES", optionsHour)
      .replace(/[:.]/g, "");
    const fileName = `${numeroWhatsApp}_${fechaActual}_${horaActual}.jpeg`;
    const filePath = `recibidos/${fileName}`;
    if (!fs.existsSync("recibidos")) {
      fs.mkdirSync("recibidos");
    }
    fs.writeFileSync(filePath, buffer);
    await flowDynamic([
      {
        body: "Me encanto!",
        media: "https://i.ebayimg.com/images/g/kfAAAOSwnZxkSTL1/s-l1600.png",
        delay: 1000,
      },
    ]);
  }
).addAction(async (ctx, {provider}) => {
  const id = ctx.key.remoteJid;
  console.log("🚀 ~ ).addAction ~ id:", id)
  const sock = await provider.getInstance();
  console.log("🚀 ~ ).addAction ~ sock:", sock)
  await sock.sendPresenceUpdate("composing", id);
  await sock.sendMessage(
     id,
    { audio: { url: "https://creativesounddesign.com/sound/mp3_14/Explosion_Large_KaBoom_Echo.mp3" }, mimetype: 'audio/mp4',ptt: true }
   );

});

const flowPdfRecibido = addKeyword(EVENTS.DOCUMENT).addAnswer(
  "He recibido tu Comprobante"
);

const flowWelcome = addKeyword("Soy Anto").addAnswer(
  "Sabes que te amo con toda mi alma",
  null,
  async (ctx) => {
    console.log(ctx);
    const numeroDeWhatsapp = ctx.from;
    const mensajeRecibido = ctx.body;
  }
);

const googelSheet = new GoogleSheetService(
  "1rDDWdRcLmecRhDSepMZdJwxMIp8iOxZMjDKuh2dA6W8"
);

const GLOBAL_STATE = [];

const flowPrincipal = bot
  .addKeyword(["hola", "hi"])
  .addAnswer([
    `Bienvenidos a mi restaurante de cocina economica automatizado! 🚀`,
    `Tenemos menus diarios variados`,
    `Te gustaria conocerlos ¿?`,
    `Escribe *menu*`,
  ]);

const flowMenu = bot
  .addKeyword("menu")
  .addAnswer(
    `Hoy tenemos el siguiente menu:`,
    null,
    async (_, { flowDynamic }) => {
      const dayNumber = getDay(new Date());
      const getMenu = await googelSheet.retriveDayMenu(dayNumber);
      for (const menu of getMenu) {
        GLOBAL_STATE.push(menu);
        await flowDynamic(menu);
      }
    }
  )
  .addAnswer(
    `Te interesa alguno?`,
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      const txt = ctx.body;
      const check = await chatgpt.completion(`
    Hoy el menu de comida es el siguiente:
    "
    ${GLOBAL_STATE.join("\n")}
    "
    El cliente quiere "${txt}"
    Basado en el menu y lo que quiere el cliente determinar (EXISTE, NO_EXISTE).
    La orden del cliente
    `);

      const getCheck = check.data.choices[0].text
        .trim()
        .replace("\n", "")
        .replace(".", "")
        .replace(" ", "");

      if (getCheck.includes("NO_EXISTE")) {
        return gotoFlow(flowEmpty);
      } else {
        state.update({ pedido: ctx.body });
        return gotoFlow(flowPedido);
      }
    }
  );

const flowEmpty = bot
  .addKeyword(bot.EVENTS.ACTION)
  .addAnswer("No te he entendido!", null, async (_, { gotoFlow }) => {
    return gotoFlow(flowMenu);
  });

const flowPedido = bot
  .addKeyword(["pedir"], { sensitive: true })
  .addAnswer(
    "¿Cual es tu nombre?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ name: ctx.body });
    }
  )
  .addAnswer(
    "¿Alguna observacion?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ observaciones: ctx.body });
    }
  )
  .addAnswer(
    "Perfecto tu pedido estara listo en un aprox 20min",
    null,
    async (ctx, { state }) => {
      const currentState = state.getMyState();
      await googelSheet.saveOrder({
        fecha: new Date().toDateString(),
        telefono: ctx.from,
        pedido: currentState.pedido,
        nombre: currentState.name,
        observaciones: currentState.observaciones,
      });
    }
  );

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = bot.createFlow([
    flowPrincipal,
    flowMenu,
    flowPedido,
    flowEmpty,
    flowWelcome,
    flowRecibirMedia,
    flowPdfRecibido,
  ]);
  const adapterProvider = bot.createProvider(BaileysProvider);

  bot.createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();
