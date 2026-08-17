window.VET_DEMO_SEED={
patients:[
{id:1,name:"Luna",species:"Canina",breed:"Mestiza",sex:"Hembra",age:"5 años",weight:"18.4 kg",owner:"Sofía Morales",phone:"+56 9 5555 0101",email:"sofia.demo@example.com",address:"Av. Ficticia 120, Santiago",lastVisit:"2026-08-10",avatar:"🐶",color:"Café y blanco",microchip:"900000000001",allergies:"Sensibilidad estacional leve",chronic:"No registradas",medications:"Ninguno",surgeries:"Esterilización 2023"},
{id:2,name:"Milo",species:"Felina",breed:"Europeo común",sex:"Macho",age:"3 años",weight:"4.8 kg",owner:"Tomás Riquelme",phone:"+56 9 5555 0102",email:"tomas.demo@example.com",address:"Pasaje Demo 45, Santiago",lastVisit:"2026-08-12",avatar:"🐱",color:"Gris",microchip:"900000000002",allergies:"No registradas",chronic:"No registradas",medications:"Ninguno",surgeries:"Castración 2024"},
{id:3,name:"Nala",species:"Canina",breed:"Golden Retriever",sex:"Hembra",age:"7 años",weight:"28.1 kg",owner:"Valentina Soto",phone:"+56 9 5555 0103",email:"valentina.demo@example.com",address:"Calle Ejemplo 88, Santiago",lastVisit:"2026-07-29",avatar:"🐕",color:"Dorado",microchip:"900000000003",allergies:"No registradas",chronic:"Rigidez osteoarticular leve",medications:"Suplemento articular ficticio",surgeries:"Ninguna registrada"},
{id:4,name:"Simón",species:"Felina",breed:"Mestizo",sex:"Macho",age:"9 años",weight:"5.6 kg",owner:"Diego Arancibia",phone:"+56 9 5555 0104",email:"diego.demo@example.com",address:"Los Datos 321, Santiago",lastVisit:"2026-08-04",avatar:"🐈",color:"Negro",microchip:"900000000004",allergies:"No registradas",chronic:"Paciente senior",medications:"Ninguno",surgeries:"Castración 2019"}
],
appointments:[
{id:101,patientId:1,date:"2026-08-17",time:"09:00",service:"Consulta general",reason:"Control anual y revisión de piel",status:"confirmada"},
{id:102,patientId:2,date:"2026-08-17",time:"10:30",service:"Vacunación",reason:"Refuerzo vacuna triple felina",status:"pendiente"},
{id:103,patientId:3,date:"2026-08-17",time:"12:00",service:"Control preventivo",reason:"Control de peso y movilidad",status:"confirmada"},
{id:104,patientId:4,date:"2026-08-17",time:"15:30",service:"Consulta general",reason:"Disminución del apetito",status:"pendiente"},
{id:105,patientId:1,date:"2026-08-18",time:"11:00",service:"Control preventivo",reason:"Revisión posterior",status:"pendiente"}
],
timeline:{
1:[{id:"e1",date:"2026-08-10",type:"Consulta",title:"Control dermatológico",text:"Prurito leve estacional. Examen general dentro de parámetros ficticios. Se indica control ambiental y seguimiento.",vet:"Camila Vera",diagnosis:"Dermatitis estacional leve",treatment:"Manejo ambiental y control",supplies:[1]},{id:"e2",date:"2026-06-21",type:"Vacuna",title:"Refuerzo preventivo",text:"Vacunación registrada para fines de demostración. Sin eventos adversos reportados.",vet:"Camila Vera",diagnosis:"Preventivo",treatment:"Vacunación",supplies:[3]},{id:"e3",date:"2026-03-05",type:"Control",title:"Control de peso",text:"Peso estable. Se mantienen actividad regular y pauta de alimentación ficticia.",vet:"Camila Vera",diagnosis:"Control nutricional",treatment:"Mantener pauta",supplies:[]}],
2:[{id:"e4",date:"2026-08-12",type:"Consulta",title:"Chequeo general",text:"Paciente activo, hidratación normal y examen físico sin hallazgos relevantes en esta demo.",vet:"Camila Vera",diagnosis:"Sin hallazgos",treatment:"Control anual",supplies:[]}],
3:[{id:"e6",date:"2026-07-29",type:"Control",title:"Control osteoarticular",text:"Se registra rigidez leve después de ejercicio prolongado. Seguimiento clínico ficticio.",vet:"Camila Vera",diagnosis:"Rigidez leve",treatment:"Reposo relativo y seguimiento",supplies:[4]}],
4:[{id:"e8",date:"2026-08-04",type:"Consulta",title:"Evaluación digestiva",text:"Apetito variable durante dos días. Sin signos de alarma en el escenario de demostración.",vet:"Camila Vera",diagnosis:"Trastorno digestivo leve",treatment:"Dieta blanda y observación",supplies:[2]}]
},
inventory:[
{id:1,name:"Shampoo dermatológico 250 ml",category:"Dermatología",stock:12,unit:"envases"},
{id:2,name:"Solución oral digestiva 100 ml",category:"Medicamentos",stock:9,unit:"frascos"},
{id:3,name:"Vacuna triple felina",category:"Vacunas",stock:18,unit:"dosis"},
{id:4,name:"Antiinflamatorio veterinario",category:"Medicamentos",stock:14,unit:"cajas"},
{id:5,name:"Suero fisiológico 500 ml",category:"Hospital",stock:24,unit:"bolsas"},
{id:6,name:"Catéter IV 22G",category:"Hospital",stock:32,unit:"unidades"},
{id:7,name:"Guantes estériles",category:"Implementos",stock:40,unit:"pares"}
],
hospitalizations:{
1:[{id:201,status:"alta",admission:"2026-01-14T10:30",discharge:"2026-01-16T17:00",reason:"Observación postoperatoria ficticia",diagnosis:"Recuperación favorable",vet:"Camila Vera",supplies:[5,6,7],daily:[{date:"2026-01-14",temp:"38.5",weight:"18.2",hr:92,rr:24,note:"Ingreso estable."},{date:"2026-01-15",temp:"38.2",weight:"18.3",hr:88,rr:22,note:"Buena evolución y apetito."}],surgeries:[{date:"2026-01-14",type:"Procedimiento menor demostrativo",result:"Exitosa",duration:45,anesthesia:"General balanceada"}],alta:{diagnosis:"Evolución satisfactoria",treatment:"Reposo relativo",recommendations:"Control en 7 días",next:"2026-01-23"}}],
2:[],3:[],4:[]
},
documents:{1:[{id:301,name:"Perfil preventivo demo.pdf",date:"2026-06-21",description:"Documento ficticio de ejemplo"}],2:[],3:[],4:[]},
audit:{1:[{date:"2026-08-10 12:40",event:"Consulta registrada",user:"Camila Vera",severity:"info"},{date:"2026-06-21 11:15",event:"Vacuna e inventario actualizados",user:"Camila Vera",severity:"info"}],2:[],3:[],4:[]}
};