import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const imageReader = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const base64Image = buffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Necesito que identifiques estos datos:  la fecha, el importe, el remitente y el banco de la transferencia.Que separes cada dato con un asterisco cosa que despues yo lo pueda parsear.Es importante que respondas eso solo asi puedo guardar la informacion en variables. Tambien que el importe solo lo separes con comas si tiene decimales mayores a 00, sino no los escribas. Los puntos que separan los miles no los escribas. La fecha porfavor siempre escribila con este formato DD-MM-AAAA. Si algun dato no lo podes reconocer o no esta porfavor escribi No identificado. ",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1000, // Límite de tokens
  });

  // Extraer los datos específicos de la respuesta
  const responseContent = response.choices[0].message.content;
  const dataParts = responseContent.split('*').map(part => part.trim());

  const fecha = dataParts[0];
  const importe = dataParts[1];
  const remitente = dataParts[2];
  const banco = dataParts[3];


  // Guardar los datos en variables
  const datosTransferencia = { fecha, importe, remitente, banco };
  console.log(datosTransferencia);
  console.log(response.choices[0]);

  return {
    respuestaApi: response.choices[0].message.content,
    datosTransferencia: datosTransferencia,
  };
};

export default imageReader;
