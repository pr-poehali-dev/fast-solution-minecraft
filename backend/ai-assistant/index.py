import json
import os
import urllib.request


def handler(event: dict, context) -> dict:
    '''ИИ-ассистент: генерирует и улучшает плагины, моды и конфиги Minecraft по описанию пользователя.'''
    method = event.get('httpMethod', 'GET')

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if method != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    mode = body.get('mode', 'generate')           # generate | improve
    rtype = body.get('type', 'plugin')            # plugin | mod | config
    fmt = body.get('format', 'jar')
    prompt = (body.get('prompt') or '').strip()
    current_code = body.get('code', '')

    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return {'statusCode': 500, 'headers': cors,
                'body': json.dumps({'error': 'OPENAI_API_KEY не настроен'}, ensure_ascii=False)}

    type_ru = {'plugin': 'плагина Bukkit/Spigot', 'mod': 'мода Forge/Fabric', 'config': 'конфигурационного файла'}.get(rtype, 'ресурса')

    if mode == 'improve':
        task = (
            f'Улучши и оптимизируй следующий код {type_ru} для Minecraft. '
            f'Исправь ошибки, добавь полезные возможности, сделай его чище. '
            f'Формат файла: .{fmt}.\n\n'
            f'Текущий код:\n{current_code}\n\n'
            f'Пожелания пользователя: {prompt or "просто сделай лучше"}'
        )
    else:
        task = (
            f'Создай рабочий код {type_ru} для Minecraft по описанию. '
            f'Формат файла: .{fmt}.\n\nОписание: {prompt}'
        )

    system = (
        'Ты — эксперт по разработке плагинов, модов и конфигов для Minecraft. '
        'Отвечай ТОЛЬКО готовым кодом или содержимым файла, без markdown-обёрток ```, '
        'без пояснений и без лишнего текста. Только сам код/конфиг.'
    )

    payload = {
        'model': 'gpt-4o-mini',
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': task},
        ],
        'temperature': 0.7,
        'max_tokens': 1200,
    }

    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )

    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    result = data['choices'][0]['message']['content'].strip()
    if result.startswith('```'):
        lines = result.split('\n')
        result = '\n'.join(lines[1:-1]) if len(lines) > 2 else result.strip('`')

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps({'code': result}, ensure_ascii=False),
        'isBase64Encoded': False,
    }
