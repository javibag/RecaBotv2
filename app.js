import "dotenv/config";
import bot from "@bot-whatsapp/bot";
import { getDay } from "date-fns";
import QRPortalWeb from "@bot-whatsapp/portal";
import BaileysProvider from "@bot-whatsapp/provider/baileys";
import MockAdapter from "@bot-whatsapp/database/mock";
//import chatgpt from "./services/openai/chatgpt.js";
import imageReader from "./services/openai/gptimages.js";
import GoogleSheetService from "./services/sheets/index.js";
import GuardaSheets from "./services/sheets/GuardaSheets.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import fs from "fs";

const { EVENTS } = bot;
const { addKeyword } = bot;
const requestQueue = [];
const MAX_REQUESTS_PER_MINUTE = 10;

const googelSheetJav = new GuardaSheets(
  "1qpVgEEZ16nEqIk3T5AlZyvfnhz9hCgdO_zBLDMb72vw"
);

const googelSheet = new GoogleSheetService(
  "1qpVgEEZ16nEqIk3T5AlZyvfnhz9hCgdO_zBLDMb72vw"
);

async function processQueue() {
  while (true) {
    if (requestQueue.length > 0) {
      const { filePath, flowDynamic, numeroWhatsApp } = requestQueue.shift();
      try {
        console.log(`Procesando imagen: ${filePath}`); 
        const response = await imageReader(filePath);
        console.log(`Respuesta recibida: ${JSON.stringify(response)}`); 
        response.datosTransferencia.telefono = numeroWhatsApp;
        googelSheetJav.saveSheet(response.datosTransferencia);
        await flowDynamic([
          {
            body: response.respuestaApi,
            delay: 1000,
          },
        ]);
        if (requestQueue.length < 1) {
        await flowDynamic([
          {
            body: "Se termino de procesar, si hay algun error porfavor escribi Leto",
            delay: 1000,
          },
        ]);
      }



      } catch (error) {
        console.error("Error procesando la solicitud:", error);
        await flowDynamic([
          {
            body: "Lo siento, hubo un problema al procesar tu comprobante. Por favor, inténtalo de nuevo más tarde.",
            delay: 1000,
          },
        ]);
      }
    } else {
      console.log("La cola de procesamiento está vacía.");
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 60000 / MAX_REQUESTS_PER_MINUTE)
    );
  }
}


processQueue();

let imageCounter = 0

const flowRecibirMedia = addKeyword(EVENTS.MEDIA).addAction(
  async (ctx, { flowDynamic }) => {
    const numeroWhatsApp = ctx.from;
    console.log(`Descargando imagen de ${numeroWhatsApp}`);
    const buffer = await downloadMediaMessage(ctx, "buffer");
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
    const fileName = `${numeroWhatsApp}_${fechaActual}_${horaActual}_${imageCounter}.jpeg`; 
    const filePath = `recibidos/${fileName}`;
    console.log(`Imagen descargada. Guardando en ${filePath}`);
    if (!fs.existsSync("recibidos")) {
      fs.mkdirSync("recibidos");
    }
    fs.writeFileSync(filePath, buffer);
    console.log(`Imagen guardada en ${filePath}`);
    requestQueue.push({ filePath, flowDynamic, numeroWhatsApp });
    imageCounter++; 
  }
);

// const flowRecibirMedia = addKeyword(EVENTS.MEDIA)
//   .addAnswer("A ver...", null, async (ctx, { flowDynamic }) => {
//     try {
//       const buffer = await downloadMediaMessage(ctx, "buffer");
//       const numeroWhatsApp = ctx.from;
//       const fechaHoraActual = new Date();
//       const optionsDate = { year: "numeric", month: "2-digit", day: "2-digit" };
//       const fechaActual = fechaHoraActual
//         .toLocaleDateString("es-ES", optionsDate)
//         .replace(/\//g, "-");
//       const optionsHour = {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       };
//       const horaActual = fechaHoraActual
//         .toLocaleTimeString("es-ES", optionsHour)
//         .replace(/[:.]/g, "");
//       const fileName = `${numeroWhatsApp}_${fechaActual}_${horaActual}.jpeg`;
//       const filePath = `recibidos/${fileName}`;
//       if (!fs.existsSync("recibidos")) {
//         fs.mkdirSync("recibidos");
//       }
//       fs.writeFileSync(filePath, buffer);
//       requestQueue.push({ filePath, flowDynamic, numeroWhatsApp });
//       //      const response = await imageReader(filePath);
//       response.datosTransferencia.telefono = numeroWhatsApp;
//       googelSheetJav.saveSheet(response.datosTransferencia)
//       await flowDynamic([
//         {
//           body: response.respuestaApi,
//           //   media: "https://i.ebayimg.com/images/g/kfAAAOSwnZxkSTL1/s-l1600.png",
//           delay: 1000,
//         },
//       ]);
//     } catch (error) {
//       console.error("Ocurrió un error:", error);
//       await flowDynamic([
//         {
//           body: "Lo siento, hubo un problema al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.",
//           delay: 1000,
//         },
//       ]);
//     }
//   })
//   // .addAction(async (ctx, { provider }) => {
//   //   const id = ctx.key.remoteJid;
//   //   const sock = await provider.getInstance();
//   //   await sock.sendPresenceUpdate("composing", id);
//   //   await sock.sendMessage(id, {
//   //     audio: { url: "explosion2.mp3" },
//   //     mimetype: "audio/mp4",
//   //     ptt: true,
//   //   });
//   // })
//   // .addAnswer(
//   //   "Si no es correcta la informacion, porfavor escribi Leto",
//   //   null,
//   //   async (ctx, { state }) => {
//   //     console.log(ctx);
//   //     const numeroDeWhatsapp = ctx.from;
//   //     const mensajeRecibido = ctx.body;
//   //   }
//   // );

const flowLeto = addKeyword("Leto").addAnswer(
  "En breve te habla Leto",
  null,
  async (ctx) => {
    console.log(ctx);
    const numeroDeWhatsapp = ctx.from;
    const mensajeRecibido = ctx.body;
  }
);

const flowPdfRecibido = addKeyword(EVENTS.DOCUMENT).addAnswer(
  "Por ahora solo imagenes"
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

  const adapterFlow2 = bot.createFlow([
    flowRecibirMedia,
    flowPdfRecibido,
    flowLeto,
  ]);

  const adapterProvider = bot.createProvider(BaileysProvider);

  bot.createBot({
    flow: adapterFlow2,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();
