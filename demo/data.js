try {
  const cached = JSON.parse(localStorage.getItem('vetsantasofia-demo-v4'));
  const invalidAppointments = cached?.appointments?.some(a => !a.vetId || !a.serviceId);
  const invalidVets = cached?.vets?.some(v => !Array.isArray(v.availability));
  if (cached && (invalidAppointments || invalidVets || !Array.isArray(cached.services))) {
    localStorage.removeItem('vetsantasofia-demo-v4');
  }
} catch {
  localStorage.removeItem('vetsantasofia-demo-v4');
}

window.VET_DEMO_SEED={
  vets:[
    {id:1,name:'Camila Vera',role:'Veterinaria',availability:['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30']},
    {id:2,name:'Ignacio Rojas',role:'Veterinario',availability:['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30']}
  ],
  services:[
    {id:1,name:'Consulta general',duration:30,category:'Consulta'},
    {id:2,name:'Control preventivo',duration:30,category:'Control'},
    {id:3,name:'Vacunación',duration:30,category:'Vacunación'},
    {id:4,name:'Cirugía menor',duration:120,category:'Cirugía'},
    {id:5,name:'Cirugía abdominal',duration:180,category:'Cirugía'}
  ],
  patients:[
    {id:1,name:'Luna',species:'Canina',breed:'Mestiza',sex:'Hembra',age:'5 años',weight:'18.4 kg',owner:'Sofía Morales',phone:'+56 9 5555 0101',email:'sofia.demo@example.com',address:'Av. Ficticia 120, Santiago',lastVisit:'2026-08-10',color:'Café y blanco',microchip:'900000000001',allergies:'Sensibilidad estacional leve',chronic:'No registradas',medications:'Ninguno',surgeries:'Esterilización 2023'},
    {id:2,name:'Milo',species:'Felina',breed:'Europeo común',sex:'Macho',age:'3 años',weight:'4.8 kg',owner:'Tomás Riquelme',phone:'+56 9 5555 0102',email:'tomas.demo@example.com',address:'Pasaje Demo 45, Santiago',lastVisit:'2026-08-12',color:'Gris',microchip:'900000000002',allergies:'No registradas',chronic:'No registradas',medications:'Ninguno',surgeries:'Castración 2024'},
    {id:3,name:'Nala',species:'Canina',breed:'Golden Retriever',sex:'Hembra',age:'7 años',weight:'28.1 kg',owner:'Valentina Soto',phone:'+56 9 5555 0103',email:'valentina.demo@example.com',address:'Calle Ejemplo 88, Santiago',lastVisit:'2026-07-29',color:'Dorado',microchip:'900000000003',allergies:'No registradas',chronic:'Rigidez osteoarticular leve',medications:'Suplemento articular',surgeries:'Ninguna registrada'},
    {id:4,name:'Simón',species:'Felina',breed:'Mestizo',sex:'Macho',age:'9 años',weight:'5.6 kg',owner:'Diego Arancibia',phone:'+56 9 5555 0104',email:'diego.demo@example.com',address:'Los Datos 321, Santiago',lastVisit:'2026-08-04',color:'Negro',microchip:'900000000004',allergies:'No registradas',chronic:'Paciente senior',medications:'Ninguno',surgeries:'Castración 2019'}
  ],
  appointments:[
    {id:101,patientId:1,vetId:1,date:'2026-08-17',time:'09:00',serviceId:1,reason:'Control anual y revisión de piel',status:'confirmada'},
    {id:102,patientId:2,vetId:1,date:'2026-08-17',time:'10:30',serviceId:3,reason:'Refuerzo vacuna triple felina',status:'pendiente'},
    {id:103,patientId:3,vetId:1,date:'2026-08-17',time:'12:00',serviceId:2,reason:'Control de peso y movilidad',status:'confirmada'},
    {id:104,patientId:4,vetId:1,date:'2026-08-17',time:'15:30',serviceId:1,reason:'Disminución del apetito',status:'pendiente'},
    {id:105,patientId:3,vetId:2,date:'2026-08-17',time:'09:30',serviceId:5,reason:'Cirugía programada',status:'confirmada'},
    {id:106,patientId:2,vetId:2,date:'2026-08-17',time:'15:00',serviceId:2,reason:'Control general',status:'pendiente'}
  ],
  timeline:{
    1:[{id:'e1',date:'2026-08-10',type:'Consulta',title:'Control dermatológico',text:'Prurito leve estacional. Examen general dentro de parámetros.',vet:'Camila Vera',diagnosis:'Dermatitis estacional leve',treatment:'Manejo ambiental y control',supplies:[1]},{id:'e2',date:'2026-06-21',type:'Vacuna',title:'Refuerzo preventivo',text:'Vacunación registrada sin eventos adversos.',vet:'Camila Vera',diagnosis:'Preventivo',treatment:'Vacunación',supplies:[3]},{id:'e6',date:'2026-03-05',type:'Control',title:'Control de peso',text:'Peso estable. Se mantiene actividad regular y pauta de alimentación.',vet:'Camila Vera',diagnosis:'Control nutricional',treatment:'Mantener pauta',supplies:[]}],
    2:[{id:'e3',date:'2026-08-12',type:'Consulta',title:'Chequeo general',text:'Paciente activo e hidratado.',vet:'Camila Vera',diagnosis:'Sin hallazgos',treatment:'Control anual',supplies:[]}],
    3:[{id:'e4',date:'2026-07-29',type:'Control',title:'Control osteoarticular',text:'Rigidez leve después de ejercicio prolongado.',vet:'Ignacio Rojas',diagnosis:'Rigidez leve',treatment:'Reposo relativo y seguimiento',supplies:[4]}],
    4:[{id:'e5',date:'2026-08-04',type:'Consulta',title:'Evaluación digestiva',text:'Apetito variable durante dos días.',vet:'Camila Vera',diagnosis:'Trastorno digestivo leve',treatment:'Dieta blanda y observación',supplies:[2]}]
  },
  inventory:[{id:1,name:'Shampoo dermatológico 250 ml',stock:12},{id:2,name:'Solución oral digestiva 100 ml',stock:9},{id:3,name:'Vacuna triple felina',stock:18},{id:4,name:'Antiinflamatorio veterinario',stock:14},{id:5,name:'Suero fisiológico 500 ml',stock:24},{id:6,name:'Catéter IV 22G',stock:32}],
  hospitalizations:{1:[{id:201,status:'alta',admission:'2026-01-14T10:30',reason:'Observación postoperatoria',diagnosis:'Recuperación favorable',vet:'Camila Vera',supplies:[5,6],daily:[{date:'2026-01-14',temp:'38.5',weight:'18.2',hr:92,rr:24,note:'Ingreso estable.'},{date:'2026-01-15',temp:'38.2',weight:'18.3',hr:88,rr:22,note:'Buena evolución.'}],surgeries:[{date:'2026-01-14',type:'Procedimiento menor',result:'Exitosa',duration:120,anesthesia:'General balanceada'}],alta:{diagnosis:'Evolución satisfactoria',recommendations:'Control en 7 días'}}],2:[],3:[],4:[]},
  documents:{1:[{id:301,name:'Perfil preventivo.pdf',date:'2026-06-21',description:'Informe clínico'}],2:[],3:[],4:[]},
  audit:{1:[{date:'2026-08-10 12:40',event:'Consulta registrada',user:'Camila Vera'}],2:[],3:[],4:[]}
};

try {
  const key = 'vetsantasofia-demo-v4';
  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(key));
  } catch {}
  const valid = cached && Array.isArray(cached.vets) && cached.vets.length >= 2 && Array.isArray(cached.services) && Array.isArray(cached.patients) && Array.isArray(cached.appointments);
  if (!valid) {
    localStorage.setItem(key, JSON.stringify(window.VET_DEMO_SEED));
  }
} catch {}