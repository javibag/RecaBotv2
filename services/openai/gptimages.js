import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const imageReader = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const base64Image = buffer.toString('base64');
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Necesito que identifiques estos datos:  la fecha, el importe, el remitente y el banco de la transferencia. Luego necesito que me respondas de la siguiente manera:Fecha:,Importe:,Remitente:,Banco:.Es importante que respondas eso solo asi puedo guardar la informacion en variables. Si algun dato no lo podes reconocer o no esta porfavor escribi No identificado. Luego pregunta al usuario si los datos son correctos." },
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
   const fecha = response.choices[0].message.content.match(/Fecha:(\d{2}\/\d{2}\/\d{4})/i)?.[1];
   const importe = response.choices[0].message.content.match(/Importe:(\d+)/i)?.[1];
   const remitente = response.choices[0].message.content.match(/Remitente:([A-Z\s]+)/i)?.[1].trim();
   const banco = response.choices[0].message.content.match(/Banco:(.+)/i)?.[1].trim();
 
   // Guardar los datos en variables
   const datosTransferencia = { fecha, importe, remitente, banco };
  //  console.log(datosTransferencia);
  // console.log(response.choices[0]);
    
  
  return {
    respuestaApi: response.choices[0].message.content,
    datosTransferencia: datosTransferencia,
  };

};

export default imageReader;
