// ═══════════════════════════════════════════════════════════
// Edge Function: notificar
// Recebe evento + dados, busca destinatários e envia e-mail via Resend
//
// Deploy: supabase functions deploy notificar
// Vars obrigatórias (Supabase Dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY  — chave da API do Resend (resend.com)
//   SUPABASE_URL    — injetada automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — injetada automaticamente
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@sulbaiana.com.br'; // configure domínio no Resend

// Mapeamento evento → assunto + corpo do e-mail
const TEMPLATES: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {

  checklist_reprovado: (d) => ({
    subject: `🚫 Check-list REPROVADO — ${d.placa} (${d.score}%)`,
    html: `
      <h2 style="color:#dc2626">🚫 Check-list Reprovado</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Veículo</td><td><strong>${d.placa} — ${d.modelo}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Score</td><td style="color:#dc2626;font-weight:700;font-size:18px">${d.score}%</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Usuário</td><td>${d.usuario}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Data/Hora</td><td>${d.data}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Contrato</td><td>${d.contrato || '—'}</td></tr>
      </table>
      ${d.itens_nao ? `<h3 style="color:#dc2626;margin-top:16px">❌ Itens com problema:</h3><ul>${(d.itens_nao as string[]).map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
      <p style="margin-top:20px"><a href="${d.url}" style="background:#1d6fdf;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver no Sistema →</a></p>
    `
  }),

  checklist_ressalvas: (d) => ({
    subject: `⚠️ Check-list com Ressalvas — ${d.placa} (${d.score}%)`,
    html: `
      <h2 style="color:#b45309">⚠️ Check-list com Ressalvas</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Veículo</td><td><strong>${d.placa} — ${d.modelo}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Score</td><td style="color:#b45309;font-weight:700;font-size:18px">${d.score}%</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Usuário</td><td>${d.usuario}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Data/Hora</td><td>${d.data}</td></tr>
      </table>
      <p style="margin-top:20px"><a href="${d.url}" style="background:#1d6fdf;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver no Sistema →</a></p>
    `
  }),

  multa_registrada: (d) => ({
    subject: `🚨 Nova Multa Registrada — ${d.placa}`,
    html: `
      <h2 style="color:#dc2626">🚨 Nova Multa Registrada</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Veículo</td><td><strong>${d.placa}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Infração</td><td>${d.descricao || '—'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Valor</td><td style="color:#dc2626;font-weight:700">${d.valor}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Data Infração</td><td>${d.data_infracao}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Vencimento</td><td>${d.data_vencimento || '—'}</td></tr>
      </table>
      <p style="margin-top:20px"><a href="${d.url}" style="background:#1d6fdf;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver no Sistema →</a></p>
    `
  }),

  km_manutencao_vencido: (d) => ({
    subject: `🔧 Alerta de KM — ${d.placa} venceu intervalo de manutenção`,
    html: `
      <h2 style="color:#b45309">🔧 Alerta de KM de Manutenção</h2>
      <p style="font-family:sans-serif;font-size:14px;margin-bottom:12px">O veículo abaixo ultrapassou o KM previsto para manutenção:</p>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Veículo</td><td><strong>${d.placa} — ${d.modelo}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">KM Atual</td><td style="font-family:monospace">${d.km_atual}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">KM Previsto (Manut.)</td><td style="font-family:monospace;color:#b45309;font-weight:700">${d.km_proxima_manut}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Excedido em</td><td style="color:#dc2626;font-weight:700">${d.km_excedido} km</td></tr>
      </table>
      <p style="margin-top:20px"><a href="${d.url}" style="background:#1d6fdf;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver no Sistema →</a></p>
    `
  }),

  contrato_vencendo: (d) => ({
    subject: `📋 Contrato vencendo em ${d.dias_restantes} dias — ${d.nome_contrato}`,
    html: `
      <h2 style="color:#b45309">📋 Contrato Vencendo em Breve</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Contrato</td><td><strong>${d.nome_contrato}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Vencimento</td><td style="color:#b45309;font-weight:700">${d.data_fim}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Dias Restantes</td><td style="color:#dc2626;font-size:18px;font-weight:800">${d.dias_restantes} dias</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Veículos vinculados</td><td>${d.total_veiculos}</td></tr>
      </table>
      <p style="margin-top:20px"><a href="${d.url}" style="background:#1d6fdf;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver no Sistema →</a></p>
    `
  }),
};

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
      }
    });
  }

  try {
    const { evento, dados, referencia_id } = await req.json() as {
      evento: string;
      dados: Record<string, unknown>;
      referencia_id?: number;
    };

    if (!evento || !TEMPLATES[evento]) {
      return new Response(JSON.stringify({ error: 'Evento inválido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Busca destinatários ativos para este evento
    const { data: configs } = await supabase
      .from('notificacoes_config')
      .select('email, nome_destino')
      .eq('evento', evento)
      .eq('ativo', true);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ ok: true, enviados: 0, motivo: 'Nenhum destinatário configurado' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const template = TEMPLATES[evento](dados);
    const resultados: { email: string; status: string; error?: string }[] = [];

    for (const config of configs) {
      try {
        const resp = await fetch(RESEND_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Frotas Sulbaiana <${FROM_EMAIL}>`,
            to: [config.email],
            subject: template.subject,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                ${template.html}
                <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0">
                <p style="font-size:11px;color:#94a3b8">
                  Este e-mail foi gerado automaticamente pelo Sistema FROTAS — Sulbaiana Empreendimentos.<br>
                  Para gerenciar notificações, acesse o sistema em Admin → Notificações.
                </p>
              </div>
            `
          })
        });

        const resendData = await resp.json() as { id?: string; message?: string };
        const ok = resp.ok;

        // Registra no log
        await supabase.from('notificacoes_log').insert({
          evento,
          referencia_id: referencia_id || null,
          email: config.email,
          status: ok ? 'enviado' : 'erro',
          mensagem: ok ? resendData.id : JSON.stringify(resendData),
        });

        resultados.push({ email: config.email, status: ok ? 'enviado' : 'erro', error: ok ? undefined : JSON.stringify(resendData) });
      } catch (err) {
        resultados.push({ email: config.email, status: 'erro', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados: resultados.filter(r => r.status === 'enviado').length, resultados }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
