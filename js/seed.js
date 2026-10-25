// Tu horario del ciclo 2026-II. Se carga solo la primera vez que entras.
// Después lo puedes cambiar desde Ajustes → Mis cursos.
// day: 1 = lunes ... 5 = viernes · start/end en horas (16 = 4:00 p. m.)

export const SEED_COURSES = [
  {
    id: 'arq', name: 'Arquitectura de Software', short: 'Arquitectura', code: 'IS-488',
    color: '#2563EB', teacher: 'Richard Zapata', credits: 0, components: [],
    schedule: [
      { day: 1, start: 7, end: 8, kind: 'teoria', teacher: 'R. Zapata' },
      { day: 2, start: 9, end: 11, kind: 'teoria', teacher: 'R. Zapata', note: 'Grupo A' },
      { day: 5, start: 7, end: 9, kind: 'lab', teacher: 'Lizbeth Jaico', note: 'Labo 01' },
    ],
  },
  {
    id: 'tel', name: 'Telecomunicaciones', short: 'Telecom.', code: 'IS-486',
    color: '#D97706', teacher: 'Roman Canchari', credits: 0, components: [],
    schedule: [
      { day: 2, start: 7, end: 9, kind: 'teoria', teacher: 'R. Canchari', note: 'Grupo A' },
      { day: 4, start: 7, end: 8, kind: 'teoria', teacher: 'R. Canchari', note: 'Grupo A' },
      { day: 3, start: 14, end: 16, kind: 'lab', teacher: 'Christian Lezama', note: 'Labo 04' },
    ],
  },
  {
    id: 'ia', name: 'Inteligencia Artificial', short: 'Int. Artificial', code: 'IS-484',
    color: '#EA580C', teacher: 'Eloy Vila', credits: 0, components: [],
    schedule: [
      { day: 2, start: 16, end: 18, kind: 'teoria', teacher: 'E. Vila', note: 'Grupo B' },
      { day: 4, start: 17, end: 18, kind: 'teoria', teacher: 'E. Vila', note: 'Grupo B' },
      { day: 4, start: 9, end: 11, kind: 'lab', teacher: 'E. Vila', note: 'Labo 2' },
    ],
  },
  {
    id: 'tes', name: 'Seminario de Tesis I', short: 'Tesis I', code: 'IS-482',
    color: '#16A34A', teacher: 'Manuel Lagos', credits: 0, components: [],
    schedule: [
      { day: 1, start: 16, end: 18, kind: 'teoria', teacher: 'M. Lagos', note: 'Grupo B' },
      { day: 2, start: 14, end: 16, kind: 'lab', teacher: 'Celia Córdova', note: 'Labo 04' },
      { day: 3, start: 16, end: 18, kind: 'lab', teacher: 'Celia Córdova', note: 'Labo 04' },
    ],
  },
  {
    id: 'web', name: 'Desarrollo Web', short: 'Des. Web', code: 'IS-882',
    color: '#7C3AED', teacher: 'Ciro Montes de Oca', credits: 0, components: [],
    schedule: [
      { day: 1, start: 20, end: 22, kind: 'virtual', teacher: 'C. Montes de Oca', note: 'Grupo A' },
      { day: 3, start: 18, end: 20, kind: 'lab', teacher: 'C. Montes de Oca', note: 'Labo virtual 01' },
    ],
  },
  {
    id: 'ss', name: 'Servicio Social', short: 'Serv. Social', code: '',
    color: '#DB2777', teacher: '', credits: 0, components: [],
    schedule: [
      { day: 5, start: 9, end: 12, kind: 'teoria', teacher: '' },
    ],
  },
];

export const DEFAULT_SETTINGS = {
  theme: 'auto',            // 'light' | 'dark' | 'auto'
  defaultReminders: [10080, 4320, 1440, 120],
  dailySummary: true,
  summaryHour: 7,
  passGrade: 10.5,          // 10.5 se redondea a 11
  termEnd: '2026-12-31',    // fin del ciclo (para el calendario del iPhone)
  lastSummary: '',
};

/** Paleta para elegir el color de un curso */
export const COURSE_COLORS = ['#2563EB', '#0EA5E9', '#D97706', '#EA580C', '#16A34A', '#0D9488', '#7C3AED', '#DB2777', '#DC2626', '#475569'];
