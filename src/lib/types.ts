export type SolicitudEstado =
  | "valida_1"
  | "no_valida_1"
  | "val_identidad"
  | "no_val_identidad"
  | "fallo_servicios"
  | "no_viable"
  | "aprobado"
  | "revision";

export interface ValidacionItem {
  label: string;
  key: string;
  estado: 1 | 2 | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export interface RawValida1Row {
  radicado: string;
  cedula: string;
  request_json:  Json;
  response_json: Json;
  created_at: string;
  updated_at: string;
  gestionado_at?: string | null;
  gestionado_by?: string | null;
  [key: string]: Json;
}

export interface RawMotorProcessRow {
  radicado: string;
  cedula: string;
  request_json:  Json;
  response_json: Json;
  [key: string]: Json;
}

export interface RawMotorDataRow {
  radicado: string;
  cedula: string;
  request_json:  Json;
  response_json: Json;
  [key: string]: Json;
}

export interface RawIdentityRow {
  radicado: string;
  cedula: string;
  request_json:  Json;
  response_json: Json;
  [key: string]: Json;
}

export interface RawCoprocenvaEnviosRow {
  radicado: string;
  cedula: string | null;
  request_json:  Json;
  response_json: Json;
  [key: string]: Json;
}


export interface SolicitudUI {
  radicado: string;
  cedula: string;
  solicitante: string;
  fecha: string;
  valor: number;
  estado: SolicitudEstado;
  score: number | null;
  decisionTexto: string;
  sinMotor: boolean;
  gestionado: boolean;
  gestionadoAt: string | null;
  validaciones: ValidacionItem[];
  raw?: {
    valida1:           RawValida1Row;
    motor_process:     RawMotorProcessRow       | null;
    motor_data:        RawMotorDataRow          | null;
    identity:          RawIdentityRow           | null;
    coprocenva_envios: RawCoprocenvaEnviosRow   | null;
    credito_decision:  null;
  };
}

/** SolicitudUI con detalle completo — raw siempre presente (endpoint /[radicado]) */
export type SolicitudDetail = SolicitudUI & {
  raw: NonNullable<SolicitudUI["raw"]>;
};
