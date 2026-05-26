"""
valida_1_fesicol.py

Réplica del patrón `valida_1` de Coprocenva, pero apuntando a la API de
Taynasoft (Fesicol). Su única responsabilidad es:

    1) Obtener token de Taynasoft.
    2) Consultar el asociado por cédula (ConsultaAsociado).
    3) Validar que la API trajo datos para esa cédula.
    4) Devolver un dict con el resultado.
"""

import json
import base64
import logging
from datetime import datetime
import requests
import urllib3

# Misma estrategia que complete_fesicol.py: la conexión se hace con
# verify=False porque el servidor de Taynasoft no presenta una cadena
# de certificados que Python pueda validar en todos los entornos.
# Silenciamos el warning de "InsecureRequestWarning" que esto genera.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
VERIFY_SSL = False

# ============================================================
# Configuración Taynasoft
# ============================================================

TAY_TOKEN_URL = (
    "https://app.tainosoft.com/WSInterfacesCredito/Services/Rest/"
    "GetToken?nIdInterfazWS=1"
)
TAY_CONSULTA_URL = (
    "https://app.tainosoft.com/WSInterfacesCredito/Services/Rest/"
    "ConsultaAsociado"
)

TAY_USER = "Want"
TAY_PASS = "WBukeuyJP5Sc160r5Db7"

# Defaults del payload de ConsultaAsociado (idénticos a complete_fesicol)
TAY_ID_INTERFAZ_WS = 1
TAY_ID_APLICATIVO = "app_tainosoft"
TAY_ID_CANAL = 3
TAY_ID_TIPO_IDENT = 1
TAY_ID_USUARIO = "usuario_tainosoft"


# ============================================================
# API Taynasoft
# ============================================================


def _generar_token_taynasoft():
    """Pide token a Taynasoft con Basic Auth."""
    basic = base64.b64encode(f"{TAY_USER}:{TAY_PASS}".encode()).decode()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {basic}",
    }

    resp = requests.post(
        TAY_TOKEN_URL, headers=headers, timeout=(5, 20), verify=VERIFY_SSL
    )
    if resp.status_code != 200:
        raise Exception(
            f"Error autenticando Taynasoft: {resp.status_code} - {resp.text}"
        )

    data = resp.json()
    token_field = data.get("token")

    # Taynasoft a veces devuelve {"token": "xxx"} y otras {"token": {"token": "xxx"}}
    if isinstance(token_field, dict):
        token = token_field.get("token")
    else:
        token = token_field

    if not token:
        raise Exception("No se encontró token en la respuesta de Taynasoft")
    return token


def _consultar_asociado_taynasoft(identificacion):
    """Consulta el asociado en Taynasoft por cédula y devuelve el JSON crudo."""
    t0 = datetime.now()
    token = _generar_token_taynasoft()
    logging.info(f"[tay] token ok en {(datetime.now()-t0).total_seconds():.2f}s")

    payload = {
        "idInterfazWS": TAY_ID_INTERFAZ_WS,
        "token": token,
        "idAplicativo": TAY_ID_APLICATIVO,
        "idCanal": TAY_ID_CANAL,
        "idTipoIdentificacion": TAY_ID_TIPO_IDENT,
        "identificacion": int(identificacion),
        "idUsuario": TAY_ID_USUARIO,
        "idTransaccion": int(datetime.now().strftime("%Y%m%d%H%M%S")),
    }

    basic = base64.b64encode(f"{TAY_USER}:{TAY_PASS}".encode()).decode()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {basic}",
    }

    resp = requests.post(
        TAY_CONSULTA_URL,
        headers=headers,
        data=json.dumps(payload),
        timeout=(5, 30),
        verify=VERIFY_SSL,
    )
    logging.info(
        f"[tay] consulta ok en {(datetime.now()-t0).total_seconds():.2f}s "
        f"(status {resp.status_code})"
    )

    if resp.status_code != 200:
        raise Exception(
            f"Error ConsultaAsociado ({identificacion}): "
            f"{resp.status_code} - {resp.text}"
        )

    return resp.json()


# ============================================================
# Normalización de la respuesta
# ============================================================


def _extraer_bloque_taynasoft(raw):
    """
    Taynasoft puede devolver dos formatos:
      A) {"status":"ok","result":{"codigoRespuesta":1,"data":{...}}}
      B) {"codigoRespuesta":1,"respuesta":"Proceso Exitoso","data":{...}}

    Esta función devuelve siempre el dict con codigoRespuesta/data.
    """
    if not isinstance(raw, dict):
        return {}

    # Caso A: envoltura status/result
    if "result" in raw and isinstance(raw["result"], dict):
        return raw["result"]

    # Caso B: ya viene plano
    return raw


def normalizar_taynasoft_response(raw):
    """Devuelve el bloque `data` con los campos del asociado, o {} si no hay."""
    bloque = _extraer_bloque_taynasoft(raw)
    data = bloque.get("data")
    if not isinstance(data, dict):
        return {}
    return data


# ============================================================
# Validación
# ============================================================


def _agregar_motivo(resultado, mensaje):
    resultado["es_apto"] = False
    resultado["motivos_no_apto"].append(mensaje)


def generar_radicado(id_asociado):
    if id_asociado is None:
        id_asociado = ""
    return f"{id_asociado}_{datetime.now().strftime('%y%m%d%H%M%S')}"


def validar_existencia_asociado(raw_response, datos_tay, chat_input):
    """
    Única regla: la API de Taynasoft tiene que haber respondido con
    `codigoRespuesta == 1` y con un bloque `data` no vacío para la cédula
    enviada.
    """
    resultado = {
        "es_apto": True,
        "motivos_no_apto": [],
        "datos_taynasoft": datos_tay,
        "chat_input": chat_input,
        "valida_existencia": 2,   # 1 = OK, 2 = NO OK
        "valida_1": 2,
        "codigo_respuesta": None,
        "respuesta_texto": None,
        "idConsulta": None,
        "radicado": "",
    }

    bloque = _extraer_bloque_taynasoft(raw_response)
    resultado["codigo_respuesta"] = bloque.get("codigoRespuesta")
    resultado["respuesta_texto"] = bloque.get("respuesta")
    resultado["idConsulta"] = bloque.get("idConsulta")

    # 1) Respuesta debe ser un dict
    if not isinstance(raw_response, dict) or not bloque:
        _agregar_motivo(
            resultado,
            "La API de Taynasoft no devolvió una respuesta válida.",
        )
    # 2) codigoRespuesta == 1
    elif bloque.get("codigoRespuesta") != 1:
        _agregar_motivo(
            resultado,
            f"Taynasoft devolvió codigoRespuesta="
            f"{bloque.get('codigoRespuesta')} ({bloque.get('respuesta')}).",
        )
    # 3) data debe ser dict y no vacío
    elif not isinstance(datos_tay, dict) or not datos_tay:
        _agregar_motivo(
            resultado,
            f"Taynasoft no devolvió datos para la cédula "
            f"{chat_input.get('id')}.",
        )
    else:
        resultado["valida_existencia"] = 1

    resultado["valida_1"] = 1 if resultado["valida_existencia"] == 1 else 2

    # Radicado: usa la cédula enviada (Taynasoft no devuelve un "id_asociado"
    # explícito, sino la combinación de nombres/apellidos).
    resultado["radicado"] = generar_radicado(chat_input.get("id"))

    return resultado


# ============================================================
# Orquestador
# ============================================================


def ejecutar_valida_1_fesicol(payload):
    """
    Punto de entrada: recibe el chat_input, consulta Taynasoft y valida que
    sí haya traído datos para la cédula. Devuelve (output, resultado).
    """
    chat_input = payload
    identificacion = chat_input.get("id")

    # Llamada a Taynasoft
    raw_response = {}
    error_api = None
    try:
        raw_response = _consultar_asociado_taynasoft(identificacion)
    except Exception as e:
        error_api = str(e)
        logging.warning(f"[tay] Error consultando API: {e}")

    datos_tay = (
        normalizar_taynasoft_response(raw_response) if raw_response else {}
    )

    # Validación
    resultado = validar_existencia_asociado(raw_response, datos_tay, chat_input)
    if error_api and resultado["valida_existencia"] != 1:
        resultado["motivos_no_apto"].insert(0, f"Error de red/API: {error_api}")

    # Output plano (estilo valida_1_output de Coprocenva)
    valida_1_output = {
        "id": chat_input.get("id"),
        "radicado": resultado["radicado"],
        "process_type": chat_input.get("process_type"),
        # eco de la respuesta de Taynasoft
        "codigo_respuesta": resultado["codigo_respuesta"],
        "respuesta_texto": resultado["respuesta_texto"],
        "idConsulta": resultado["idConsulta"],
        # nombre / apellidos si vinieron
        "primerNombre": datos_tay.get("primerNombre"),
        "segundoNombre": datos_tay.get("segundoNombre"),
        "primerApellido": datos_tay.get("primerApellido"),
        "segundoApellido": datos_tay.get("segundoApellido"),
        # flags
        "valida_existencia": resultado["valida_existencia"],
        "valida_1": resultado["valida_1"],
        # diagnóstico
        "es_apto": resultado["es_apto"],
        "motivos_no_apto": resultado["motivos_no_apto"],
        # respuesta cruda del servicio Taynasoft (tal como llegó)
        "taynasoft": raw_response if isinstance(raw_response, dict) else {},
    }

    return valida_1_output, resultado


# ============================================================
# Ejecución directa (prueba rápida)
# ============================================================

if __name__ == "__main__":
    import os

    logging.basicConfig(level=logging.INFO)

    chat_input_demo = {
        "process_type": 1,
        "last_name": "Gonzalez",
        "id": "53076767",
        "peso": "61",
        "estatura": "161",
        "idAsesorComercial": "3",
        "req_pledge": 0,
        "req_mortgage": 0,
        "id_type": 1,
        "credit_line": 23,
        "indAsegurabilidad": "2",
        "req_amount": "7500000",
        "email": "Dianae.gonzalezc@gmail.com",
        "celular": "3183780908",
        "indAutorizacion": "1",
        "credit_term": "24",
    }

    output, resultado = ejecutar_valida_1_fesicol(chat_input_demo)

    # Imprime en consola
    print(json.dumps(output, ensure_ascii=False, indent=2))

    # Guarda el JSON al lado del script
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(
        out_dir, f"valida_1_fesicol_{chat_input_demo['id']}.json"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] JSON guardado en: {out_path}")