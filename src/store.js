// LocalStorage & API Hybrid Store for DTS

import { parseCSV } from './generator.js';
import { api } from './api.js';

const STORAGE_KEY = 'dts_documents_v1';
const THEME_KEY = 'dts_theme_mode';
const USER_KEY = 'dts_logged_user';

export const RAW_ASSET_CSV = `id,kind,dtsNo,fromOffice,details,receivedBy,toOffice,date
mqoij32d_ixqwy9,forward,003120260618ee7c,extension ,"MOA Sangguniang kabataan of 
Barangay Solana, Jasaan x USTP",,extension office,2026-06-22
mqoinn3w_12ahf8,forward,0031202606181b9y,extension ,"MOA Sangguniang kabataan
of barangay Solana, Jasaan
IOT Solar StreetLight",,extension office,2026-06-22
mqoiw1wa_1rdy58,forward,003120260618fyyz,extension ,"MOA KM 12 Lunao Farmers Association
Manukultura Project
Engr. Gonzales",,chancellor,2026-06-22
mqoizju2_ic0bnp,forward,00302026061843vo,research,"Request the release of 
honoraria
Silagan
Pagaspas
Pegarro
Caburatan",,accounting/finance,2026-06-22
mqoj3ybl_nasgir,forward,001120260617xy3u,extension ,"Manukultura Phase 2
Safe Operation, Machine Readiness, 
Validation...
Helen Gonzales",,accounting/finance,2026-06-22
mqowldha_c67adg,forward,NONE,VCRIE,"OIC - Maricel Dalde
Travel Order Documents
June 22-25, 2026
",,chancellor,2026-06-22
mqq06rdv_nf71lb,forward,003420260622QSXD,NMFIC,[NMFIC] Modification of Budget,,accounting/finance,2026-06-23
mqq09msi_howb9n,forward,003020260622BW7Z,Research Office,PURCHASE REQUEST,,accounting/finance,2026-06-23
mqq0dqmx_zr0183,forward,NONE,CET,"Request for Renewal of Student Assistant

-Cabaring
-Darapa",,accounting/finance,2026-06-23
mqq0kbgo_xmpe1a,forward,003120260622QTL0,extension & Community Relations division,"MOA Reimbursement Sangguniang Kabataan 
of Barangay Solana, Jasaan 
(Basic SMAW Project, Engr. Maña) 
and (IoT Solar Project, Engr. Pabilona)
/COT/600.00",,accounting/finance,2026-06-23
mqq0mozk_dk41tq,forward,003120260622JINR,extension & Community Relations division,"MOA Reimbursement Dahilayan Forest
Park/Dr. Gina Lacang Project/CSM/300.00",,accounting/finance,2026-06-23
mqq0qt53_0lyvuo,forward,NONE,Accounting,DISBURSEMENT VOUCHER,,President office,2026-06-23
mqrrttki_dos7v7,forward,11692026062450I8,VCRIE,"FWA Form VCRI/ITSD
Busmeon, Emata, Malunjao, Lorilla - VCRI Guzman - ITSD",,HRMO,2026-06-24
mqrsnalg_n08e8a,forward,003120260623JEY6,VCRI,"PR Subscription Expenses Canva/ 5,000",,accounting/finance,2026-06-24
mqrsvkf6_58tis7,forward,2298202606240RR0,VCRI,"CHED- Terminal Monitoring and 
Evaluation Form for Institutional
Grants - Development & Innovation
(USTP-CET CDO)",,CET,2026-06-24
mqrsz2ix_t646au,forward,ETL 26-05-0313,VCRIE,DISBURSEMENT VOUCHER,,President office,2026-06-24
mqrtx6ya_kix3hq,forward,,VCRIE,"TRAVEL ORDER-ALEX MAUREAL
June 28-30, 2026- 16 anniversary Celebration of DOST-PCIEERD
Makati City 
18,439.16",,accounting/finance,2026-06-24
mqt2qsp2_qseli8,forward,NONE,Accounting,"Disbursement Voucher

FASPECC
JO#17053
DV#06-1310
1,600.00

FASPECC
JO#16857
DV#06-1309
4,000.00

FASPECC
JO#16869
DV#06-1304",,chancellor,2026-06-25
mqt2sat1_ik1ch5,forward,35762026062580jf,Bamboost,Annual Report (Bamboost Phase 2),,chancellor,2026-06-25
mqt2ur05_lddyh7,forward,224520260624kyel,CDO Bites,"Justification for official Travel
Franch lorilla and Alex Maureal
June 28-30, 2026",,chancellor,2026-06-25
mqt3a156_4y2ipb,forward,003120260622lu78,extension ,"Letter for approval 
Honoraria of budget for 2026
45,235.75",,accounting/finance,2026-06-25
mqt3ib3s_rpehdn,forward,,VCRIE,"TIME LOG APPLICATION
KRIZZIA MARIE EMATA
JUNE 25, 2026",,HRMO,2026-06-25
mqyljulx_6vye7d,forward,003020260623AD6U,Research Office,"MOA USTP x 
Erlyn Grace P. Aguilar - leader
",,accounting/finance,2026-06-29
mqymzsn5_0l4lso,forward,NONE,VCRIE,"Job Order A
16pcs Evacuation Map
Reimbursement",,accounting/finance,2026-06-29
mqyng0jh_df1xfe,forward,NONE,VCRIE,"Reimbursement of Meals
NTC QOS
May to June
9,572.25

Reimbursement of Notarial Fee
NTC QOS
January to June
2,300.00

Reimbursement of courier fee
December to March
NTC QOS
1,335.00

Reimbursement of meals
April to May
NTC QOS
11,132.00",,EFP,2026-06-29
mqysv8ip_u11mhy,forward,2245420260625vf08,CDO Bites,"Reimbursement of Travel
Franch Maverick Lorilla
June 9-11, 2026
Anquillano
Gadiane
Sacoso
Baja
Padayao",,accounting/finance,2026-06-29
mqyt4c2v_3n35ja,forward,003420260616ozvc,NMFIC,"Renewal of Contracts
Job Order Personnel
Rosario
Pamisa
Bete
Gastardo
Alfaraz
Gulle
Molo",,accounting/finance,2026-06-29
mr1n4nj6_4hrejb,forward,003120260629A95r,extension ,"Extension Project
Capacity Building for 
dried fish program of Luz Banzon
Erlyn Grace Aguilar ",,chancellor,2026-07-01
mr1nafow_normhp,forward,003120260629a2dr,extension ,"OIC Mark Angelo Walag
July 13-16, 2026
Compensatory time off of
maria teresa fajardo",,chancellor,2026-07-01
mr1nelq7_dum43t,forward,0034202606255pxw,NMFIC,"Modification of Budget
Phoebe Galeon",,accounting/finance,2026-07-01
mr1nuupv_zv67du,forward,003420260629gttw,NMFIC,"PPMP#32942-34-1
Request for pre-repair inspection
",,accounting/finance,2026-07-01
mr1qis46_nz7u6b,forward,NONE,VCRIE,"Accomplishment Reports

NTC EDGE/ QOS
E.Labrada
O.Labrada
Bunjan
Labrador",,EFP,2026-07-01
mr1qo1t9_efjiym,forward,NONE,research,"DTR
Maricel Dalde
June 2026",,HRMO,2026-07-01
mr1r0q6i_2vxole,forward,2245202607019v8n,CDO Bites,"Approval of Request
Honoraria for Resource Speakers
and Mentors
Justification Letter",,accounting/finance Maam Reyna,2026-07-01
mr34kp1v_nc2sbs,forward,NONE,research,"Letter Request
Seminar Workshop on transportation 
Planning Software
20,100.00",,VCAA,2026-07-02
mr34rygh_hv49uj,forward,240320260701tgoi,BIOSS,"Liquidation Report 
June 28-30, 2026
Sam Magomnang
14,335.80
Makati City",,accounting/finance,2026-07-02
mr34v63s_is13np,forward,003120260702435m,extension ,"Application for Leave
Maria teresa fajardo
October 2,5-9,12-15,16,19, 2026
",,HRMO,2026-07-02
mr39mqlm_509dvi,forward,NONE,VCRIE,"Letter Request
Three Day Training on AI
July 13-15, 2026
Lagonglong, Mis.Or.",,chancellor,2026-07-02
mr39otuh_ny3trf,forward,NONE,City College of Cagayan de Oro,"MOA
City College of Cagayan de Oro
USTP",,VCAA,2026-07-02
mr39sbjc_e4mbxs,forward,NONE,,"MOA
DR. Desiree Dawn Saraspe
USTP

MOA
Jhon Harvey Babia
USTP
",,accounting/finance,2026-07-02
mr39zo5j_luwr80,forward,00312026070246oi,extension ,"MOA
Reimbursement
Bukidnon State University
300.00",,accounting/finance,2026-07-02
mr3a77cd_blujyy,forward,NONE,VCRIE,"Reimbursement of travel
Actual Itinerary of travel
June 28-30, 2026",,accounting/finance,2026-07-02
mr3aakck_rzz9ye,forward,003420260702CA5g,NMFIC,"Justification Letter
Travel Request
Perez, Gulle, Pamisa",,accounting/finance,2026-07-02
mr3abwfw_16d67q,forward,224520260702oiuc,CDO Bites,"DTR Lorilla Franch 
June 2026
",,HR System,2026-07-02
mr3acu18_9dx6ck,forward,224520260702wihi,CDO Bites,"DTR
Lorilla Franch
June 2026",,COT,2026-07-02
mr8tw7x5_qtkysg,forward,NONE,Accounting,"BUR#07-0606
PO#07-0129
PR#34-13",,chancellor,2026-07-06
mr8u1k3c_vl0z62,forward,NONE,VCRIE,"Job Order Meals/11pax
July 13,2026
",,accounting/finance,2026-07-06
mr8ughmk_0kfynm,forward,116920260706VBF0,VCRIE,"Travel order-July 21-24, 2026
Engr. Alex L. Maureal/Camiguin
",,accounting/finance,2026-07-06
mr8uhntw_rfo86n,forward,116920260706DRNW,VCRIE,"Travel Reimbursement-June 20-25, 2026
Engr. ALex L. Maureal
",,accounting/finance,2026-07-06
mr8ulj6c_8dwm45,forward,NONE,Accounting,"Disbursement Voucher
DV#06-0425
10,319.85
PO#05-008a",,President office,2026-07-06
mr9x979p_6o9s2n,forward,NONE,Accounting,"Disbursement Voucher No: IGF 26-07-1370 
IGF 26-07-1369",,chancellor,2026-07-07
mr9xc14k_zvpuky,forward,003120260706ZUNG,extension & Community Relations division,UGMAD TUPLOK goes to Opol National Secondary Technical School / Babia / CITC / July 2026,,chancellor,2026-07-07
mr9xd750_vhigob,forward,0031202607064OFQ,extension & Community Relations division,Ethical Hacking and Defensive Cyber Operations Training / Estrera / CITC / July 2026,,chancellor,2026-07-07
mr9xemx8_cs4cvj,forward,003120260706066GP0,extension & Community Relations division,Creative Edge Brand Management and Digital Media Skills Training / Bete / CITC / July 2026,,chancellor,2026-07-07
mra5ovr5_uikppd,forward,NONE,VCRIE,"3 Justification Letters

-Travel Justification
 Opening Ceremony-RSTW
-Training Justification
 API-Quarterly Meeting
-Travel Justification
 Lagonglong, July 14-15, 2026",,chancellor,2026-07-07
mra5s5p4_kow2g8,forward,NONE,VCRIE,"Special Order

Engr. Alex Maureal
Project Leader-NTC QOS
2025",,chancellor,2026-07-07
mra96d6m_z4hkhk,forward,NONE,VCRIE,Request for Honoraria Processing for Resource Speaker,,accounting/finance,2026-07-07
mra98cm8_xn9qmv,forward,003420260707EGCZ,NMFIC,Budgetary Request Letter for Pest Abatement Services,,accounting/finance,2026-07-07
mra9a0vc_j9ekr3,forward,003120260707VBAW,extension & Community Relations division,"Budgetary letter request USTP ALS-NSP year 3, batch 3, ID Issuance and Lanyard / Amount 9750.00",,accounting/finance,2026-07-07
mra9bnjc_nn1idl,forward,NONE,VCRIE,Shanieka Busmeon & Dekeisha Chase Guzman (Time Schedule Request),,HRMO,2026-07-07
mrbqip82_rxn9y8,forward,NONE,Accounting,"BUR
#07-0633
PO#06-0126
PR#34-12

Disbursement voucher
DV#07-1391
300.00",,chancellor,2026-07-08
mrbqlcwp_fzt8p1,forward,NONE,Accounting,"Request for Payment
w/ Justification letter
Job Order A
Varsity JAcket
Umbrella",,accounting/finance,2026-07-08
mrbu0cnt_6wzi89,forward,NONE,VCRIE,"Travel order
w/ attached Justification Letter
July 21-24, 2026
Camiguin
Engr. Alex Maureal",,chancellor,2026-07-08
mrbu3hu1_6p0kt8,forward,NONE,Accounting,"Disbursement Voucher
DV#07-0439
Reimbursement of meals
1,335.00

DV#07-0438
Bamboost
6,009.82",,chancellor,2026-07-08
mrbu67s8_s4upvt,forward,NONE,Accounting,"BUR
Cancel ETL 07-0397
55,622.00",,EFP,2026-07-08
mrbu8d74_7gie2f,forward,224520260708fftb,CDO Bites,"Travel Order
Franch Lorilla
July 22-25, 2026
",,accounting/finance,2026-07-08
mrbue5p3_uy3z7g,forward,0034202607082rav,CDO Bites,"PPMP  
air conditioning unit
PPMP#32642-34-1",,accounting/finance,2026-07-08
mrbujqxx_jx1eqy,forward,NONE,NMFIC,"Travel Itinerary
w/ justification letter
Ramil Gulle
Christian Pamisa",,accounting/finance,2026-07-08
mrd6ch0l_5x53tw,forward,003020260708rsbf,Research Office,"Request for OIC designation
Maricel Dalde - Dr. Janeth Rondina
July 14-15, 2026",,chancellor,2026-07-09
mrd6eir0_cjbcta,forward,NONE,CSTE,"Liquidation Report
June 11, 2026
Transforming Success into
Service",,accounting/finance,2026-07-09
mrd6htir_tiypvo,forward,NONE,Accounting,"Disbursement Voucher
DV#07-0440
Bamboost
10,713.57",,President office,2026-07-09
mrirezcg_3d9y6w,forward,NONE,Accounting,"Disbursement Vouchers

Alex Maureal
CA- DV#07-1428
25,500.00

Maricel Dalde
CA-DV#07-1430
2,700.00

Franch Lorilla
DV#07-1429
2,700.00
",,chancellor,2026-07-13
mrisuini_94mhen,forward,NONE,VCRIE,"Letter Request for
VCRI and ITSD Mid-Year
Evaluation and Planning Activity
July 27-28, 2026",,chancellor,2026-07-13
mrit1hr9_kgr0l4,forward,003120260708q1mt,extension ,"Letter Communication
July 28, 2026 to August 2, 2026
Cebu",,chancellor,2026-07-13
mrit42ac_kxsi0o,forward,0031202607099A2U,extension ,"MOA Barangay Pangyawan
Consolacion/ Project Blue Carbon...
",,chancellor,2026-07-13
mrmvn9cu_hgtxhv,forward,,NMFIC,"NMFIC Purchase Request (150,000.00)
Supplies and materials for packaging equipment",,accounting/finance,2026-07-16
mrmvoyyl_efweey,forward,,CDO Bites,"PPMP for Aircon Unit 
with PR NO. 2026-34-15 (30,000.00)",,accounting/finance,2026-07-16
mrmvqdy5_iypeza,forward,,extension office,"Modification 2026 3rd quarter/137,000.00
EXTENSION OFFICE",,accounting/finance,2026-07-16
mrmvsyqd_xose78,forward,,extension office,"Letter and PR for kahigayunan 2026 Booth Rental/3000
Extension office",,accounting/finance,2026-07-16
mrmvuu3o_5u1ip7,forward,,NMFIC,"NMFIC PPMMP 100,000.00",,accounting/finance,2026-07-16
mrmw1heb_jm10eu,forward,,extension office,"future-ready faculty development 2026 strengthening practice-based research, collaborative scholarship and research-based SDG-Alligned Extension management in local higher education/DR.FAJARDO/CSTE/JULY 2026",,chancellor,2026-07-16
mrmw5hpn_04x3j4,forward,,Accounting,"VOUCHER NO. IGF 26-07-1460
IEP-BOOK CENTER
TOKEN EXPENSES 
4,500.00",,chancellor,2026-07-16
mrmw89oj_jj7vv4,forward,,Accounting,"DISBURSEMENT VOUCHER IGF 26-07-1453
FRANCH MAVERICK A. LORILLA
REIMBURSEMET IN NORMINRIPE2026
37,020.00",,chancellor,2026-07-16
mrmwa5e3_8pkwqj,forward,,Accounting,"DV NO. 2026-06-0418

ANTIMONY TECHNOLOGIES OPC
326,124.29",,President office,2026-07-16
mrmwe54i_g48ux7,forward,,extension office,"LETTER REQUEST FPR KAHIGAYUNAN 2026/BOOTH RENTAL 3,000.00",,accounting/finance,2026-07-16
mrmwrchc_z8wb3g,forward,,BAC,"BAC RESOLUTION NO. EFP-MOP-2026-0002
RECOMMENDING MODES OF PROCUREMENT (SUPPLEMENTAL ANNUAL PROCUREMENT PLAN FOR FY 2026 EXTERNALLY FUNDED PROJECTS EFP) 3RD QUARTER BATCH 1",,BAC/PROCUREMENT,2026-07-16
mrmwxu4g_q8h2u8,forward,,BAC,"BAC RESOLUTION NO. EFP-MOP-2026-0003
UPDATE ANNUAL PROCUREMENT PLAN FOR CY 2026 1ST SEMESTER EXTERNALLY FUNDED PROJECTS EFP AS OF JUNE 30, 2026",,BAC/PROCUREMENT,2026-07-16
mrmwypds_n7puq3,forward,,VCRIE,"OIC LETTER MS.PHOEBE L. GALLEON (JULY 14-15, 2026)",,chancellor,2026-07-16
mrn7200u_aesl18,forward,,extension ,MOA TUBURAN NATIONAL HIGH SCHOOL/PROJECT ROBOLIKHA/GONZALES/COT,,chancellor,2026-07-16
mrn750ji_jp5dok,forward,,research,"MOA ""TRACKING THE TRANSFORMATIVE IMPAT OD USTP'S RESEARCH AND INVESTIGATORY PROJECT (IP) COACHING PROGRAMS ON SCIENCE TEACHER OF CDO NATIONAL HIGH SCHOOL""
JHON HARVEY C. BABIA",,accounting/finance,2026-07-16
mrn790mt_bhe52n,forward,,extension ,"MOA REIMBURSEMENT KM 12 LUNAO FARMERS ASSOCIATION, CITY COLLEGE OF CDO, BARGY. PANGYAWAN/OR NO. 02395/900
900.00",,accounting/finance,2026-07-16
mrn7co0t_9yzhel,forward,,VCRIE,"CONTRACT OF SERVICES ""NTC NATIONWIDE QUALITY OF SERVICE (QOS) MAPPING AND ASSESSMENT OF PERFORMANCE OF TELECOMMUNICATIONS AND BROADBAND PROVIDERS
ENNA ANOOS
JAN ANDREA HERMOSO 
JANE FAITH LABRADOR
MARK VINCENT BUNJAN",,accounting externally funded,2026-07-16
mrn7d2jp_zgx4uz,forward,,VCRIE,"DTR
EDWARD  LANCE A LORILLA",,HRMO,2026-07-16
mrn7g2gd_esrj59,forward,,NMFIC,"REQUEST FOR BUDGET MODIFICATION
60,000.00",,accounting/finance,2026-07-16
mrn9nxl7_oe3n42,forward,,VCRIE,"travel Liquidation Report July 14-15, 2026
LAGONGLONG, MISAMIS ORIENTAL
ALEX L. MAUREAL - 25,500.00
FRANCH MAVERICK LORILLA - 2,700.00",,accounting/finance,2026-07-16
mrnaupvy_c69pjs,forward,,Accounting,landbank form,,accounting/finance,2026-07-16
mrnaw3fi_8qznp5,forward,,VCRIE,"Travel Liquidation report
JULY 14-15, 2026
MARICEL DALDE 
2,700.00",,accounting/finance,2026-07-16
mrsn463u_so7lpm,forward,NONE,VCRIE,"Travel Order/Travel Docs
Ulrich uy
July 21-24, 2026
",,accounting/finance,2026-07-20
mrsupakb_ioihwy,forward,NONE,Accounting,"Disbursement Vouchers

Lorilla
DV#07-1471
CA - Camiguin
July 22-25, 2026
48,300.00

Fajardo
DV#07-1484
Reimbursement July 2
300.00",,chancellor,2026-07-20
mrsvpkw6_7rmzxk,forward,116920260720UHSF,VCRIE,"(Research, VCRIE/ITSD, Extension Office) Travel Order / Travel Documents July 27-28, 2026",,accounting/finance,2026-07-20
mrsvqb9p_7y8925,forward,116920260720VR8A,VCRIE,"Travel Order - July 27, 2026, Franch Maverick Lorilla, Civoleg Gingoog City",,accounting/finance,2026-07-20
mrsvqr4t_4cfooz,forward,1169202607205Z3H,VCRIE,"Travel Order - July 27, 2026, Alex Maureal, Civoleg Gingoog City",,accounting/finance,2026-07-20
mrsvr7vq_kbte8z,forward,116920260720AM6K,VCRIE,"Travel Order - July 27, 2026, Dr. Maria Teresa Fajardo, Civoleg Gingoog City",,accounting/finance,2026-07-20
mrsvrnwt_jwh2ha,forward,1169202607200HPL,VCRIE,"Travel Order - July 27, 2026, Edwin Cuizon, Arcel Diaz, Paul joseph Estrera Civoleg Gingoog City",,accounting/finance,2026-07-20
mrsvs479_70bcyh,forward,116920260720MA4P,VCRIE,"Travel Order - July 27, 2026, Engr. Adonis Closas, Sheryl Ann Reponte, Kryzl Paglinawan Civoleg Gingoog City",,accounting/finance,2026-07-20
mrt0gprk_lbsfvs,forward,NONE,MATH Dept.,"Proposal, Graduate research 
lecture series on machine learning 
for earthquake-induced landslide prediction
and warning in the Philippines",,chancellor,2026-07-20
mrt0iddj_2ds18w,forward,NONE,extension ,"MOA

USTP x Bonbon
Lelit Molina

USTP x Bayabas
Rudy O. Lago",,chancellor,2026-07-20
mru2csjy_kq62t0,forward,NONE,Accounting,"Disbursement Vouchers

Arcel Diaz
DV#07-1486
1,240.00

Alex Maureal
Reimbursement
June 20-25, 2026
3,398.00
",,chancellor,2026-07-21
mru3bhqa_nmhcsk,forward,224520260720rk78,CDO Bites,"Travel order
Franch Lorilla
Ozamis City
July 27-30, 2026
official time",,chancellor,2026-07-21
mruef2qh_emxsej,forward,123020260715zu66,USTP Panaon,"Purchase Request 
PR#3652-02
Bonilla
",,accounting/finance,2026-07-21
mruegye1_ndzt3g,forward,003420260721e35w,CDO Bites,"Office Budget Realignment
128,000.00
",,accounting/finance,2026-07-22
mrueinhl_vqgcef,forward,NONE,Accounting,"Disbursement Voucher
DV#07-857
Bond Premium Renewal
Franch Lorilla",,chancellor,2026-07-21
mruerodz_bu3y5s,forward,003120260721fkl9,extension ,"MOA Reimbursement 
Tuburan National
High School
Bonbon
900.00",,accounting/finance,2026-07-21
mrvqzsz4_4fiq2p,forward,NONE,Accounting,"Disbursement voucher
CA TEV Fajardo
DV#07-1510
12,338.00",,chancellor,2026-07-22
mrwzbti3_s86km3,forward,NONE,Accounting,"BUR 

BUR#07-0800
PO#01-79
29,627.00

BUR#07-0801
PO#07-0180
PR#34-08
3,387.00

BUR#07-0808
PO#07-0182
PR#34-09
6,454.00

BUR#07-0814
PO#07-0186
PR#34-10
10,719.00

BUR#07-0813
PO#07-0185
PR#34-10
12,520.00

",,chancellor,2026-07-23
mrwzg8fu_2bfbzg,forward,NONE,Accounting,"Disbursement Vouchers

DV#07-1520
Franch Lorilla
Reimbursement travel
Manolo, June 9-11, 2026
31,380.00

DV#07-1519
Alex Maureal
Reimbursement travel
Manila, June 28-30, 2026
21,713.88",,chancellor,2026-07-23
mrwzj316_i4gr1u,forward,237120260722s8t2,Methane Gas..,"Leave Greg Cubio
July 28-30, 2026",,chancellor,2026-07-23`;

class DTSStore {
  constructor() {
    this.theme = localStorage.getItem(THEME_KEY) || 'dark';
    this.currentUser = this.loadUser();
    this.isServerOnline = false;
    this.isMongoConnected = false;
    this.documents = [];
    this.scannedDocuments = [];
    this.initStore();
  }

  async initStore() {
    await this.checkBackendStatus();
    await this.syncDocuments();
    await this.syncScannedDocuments();
  }

  async checkBackendStatus() {
    const wasMongoConnected = this.isMongoConnected;
    const health = await api.checkHealth();
    this.isServerOnline = health.online;
    this.isMongoConnected = health.mongoConnected;

    // Realtime offline-to-online auto-sync trigger
    let syncedCount = 0;
    if (!wasMongoConnected && this.isMongoConnected && this.currentUser) {
      syncedCount = await this.syncOfflineDocsToMongo();
    }

    return {
      ...health,
      statusChanged: wasMongoConnected !== this.isMongoConnected,
      syncedCount
    };
  }

  loadUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  saveUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  logout() {
    api.setToken(null);
    this.saveUser(null);
    this.documents = [];
  }

  getUserOfficesKey() {
    const norm = this.currentUser ? this.currentUser.username.toLowerCase().trim() : 'guest';
    return `dts_user_offices_${norm}_v1`;
  }

  getUserOffices() {
    if (!this.currentUser) return [];
    try {
      const raw = localStorage.getItem(this.getUserOfficesKey());
      if (raw) return JSON.parse(raw);
      if (this.currentUser.offices && Array.isArray(this.currentUser.offices)) {
        return this.currentUser.offices;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  async saveUserOffices(offices) {
    if (!this.currentUser) return [];
    const clean = Array.from(new Set(offices.map(o => String(o).trim()).filter(Boolean)));
    try {
      localStorage.setItem(this.getUserOfficesKey(), JSON.stringify(clean));
      if (this.currentUser) {
        this.currentUser.offices = clean;
        this.saveUser(this.currentUser);
      }
      if (this.isServerOnline) {
        await api.updateUserOffices(clean);
      }
    } catch (e) {
      console.warn('Failed to save user offices:', e);
    }
    return clean;
  }

  async addUserOffice(officeName) {
    if (!officeName) return this.getUserOffices();
    const cleanName = officeName.trim();
    if (!cleanName) return this.getUserOffices();

    const current = this.getUserOffices();
    if (current.some(o => o.toLowerCase() === cleanName.toLowerCase())) {
      return current;
    }

    const updated = [...current, cleanName];
    return await this.saveUserOffices(updated);
  }

  async removeUserOffice(officeName) {
    const current = this.getUserOffices();
    const norm = String(officeName).trim().toLowerCase();
    const updated = current.filter(o => o.trim().toLowerCase() !== norm);
    return await this.saveUserOffices(updated);
  }

  async updateUserOfficeName(oldName, newName) {
    const cleanNew = String(newName).trim();
    if (!cleanNew) return this.getUserOffices();
    const current = this.getUserOffices();
    const normOld = String(oldName).trim().toLowerCase();
    const updated = current.map(o => o.trim().toLowerCase() === normOld ? cleanNew : o);
    return await this.saveUserOffices(updated);
  }

  async syncDocuments() {
    if (!this.currentUser) {
      this.documents = [];
      return [];
    }

    const normUsername = this.currentUser.username.toLowerCase().trim();

    if (this.isServerOnline && this.isMongoConnected) {
      try {
        const remoteDocs = await api.fetchDocuments();
        if (Array.isArray(remoteDocs)) {
          // Check for any unsynced local offline docs to preserve
          const localDocs = this.loadLocalDocs();
          const unsynced = localDocs.filter(d => d.syncedToMongo === false);

          const remoteMap = new Set(remoteDocs.map(r => r.id));
          const pendingUnsynced = unsynced.filter(u => !remoteMap.has(u.id));

          this.documents = [...pendingUnsynced, ...remoteDocs.map(r => ({
            ...r,
            createdBy: normUsername,
            syncedToMongo: true
          }))];

          this.saveLocalDocs(this.documents);
          return this.documents;
        }
      } catch (e) {
        console.warn('API fetch failed, reading LocalStorage fallback:', e);
      }
    }
    this.documents = this.loadLocalDocs();
    return this.documents;
  }

  async syncOfflineDocsToMongo() {
    if (!this.currentUser || !this.isMongoConnected) return 0;

    const localDocs = this.loadLocalDocs();
    const unsynced = localDocs.filter(d => d.syncedToMongo === false || (d.id && (d.id.startsWith('dts-') || d.id.startsWith('mem-'))));

    if (unsynced.length === 0) return 0;

    try {
      console.log(`Syncing ${unsynced.length} offline browser-stored records to MongoDB...`);
      await api.batchImport(unsynced, false);
      const remoteDocs = await api.fetchDocuments();
      if (Array.isArray(remoteDocs)) {
        this.documents = remoteDocs.map(r => ({ ...r, createdBy: this.currentUser.username, syncedToMongo: true }));
        this.saveLocalDocs(this.documents);
      }
      return unsynced.length;
    } catch (err) {
      console.error('Failed to sync offline docs to MongoDB:', err);
      return 0;
    }
  }

  loadLocalDocs() {
    if (!this.currentUser) return [];
    const normUsername = this.currentUser.username.toLowerCase().trim();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const allDocs = JSON.parse(raw);
      return allDocs.filter(d => (d.createdBy || '').toLowerCase().trim() === normUsername);
    } catch (e) {
      return [];
    }
  }

  saveLocalDocs(docs) {
    this.documents = docs;
    if (!this.currentUser) return;
    const normUsername = this.currentUser.username.toLowerCase().trim();
    
    // Preserve other users' documents in local storage fallback
    let existingAll = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) existingAll = JSON.parse(raw);
    } catch (e) {}

    const otherUsersDocs = existingAll.filter(d => (d.createdBy || '').toLowerCase().trim() !== normUsername);
    const updatedDocs = docs.map(d => ({ ...d, createdBy: normUsername }));
    const combined = [...updatedDocs, ...otherUsersDocs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  }

  getDocuments() {
    return [...this.documents];
  }

  getDocumentById(id) {
    return this.documents.find(doc => doc.id === id);
  }

  async addDocument(doc) {
    const currentUsername = this.currentUser ? this.currentUser.username.toLowerCase().trim() : 'system';

    const payload = {
      trackingNo: doc.trackingNo || 'NONE',
      fromOffice: doc.fromOffice || '',
      details: doc.details || '',
      receivedBy: doc.receivedBy || '',
      toOffice: doc.toOffice || '',
      date: doc.date || new Date().toISOString().split('T')[0],
      type: doc.type || 'forward',
      createdBy: currentUsername
    };

    if (this.isServerOnline && this.isMongoConnected) {
      try {
        const created = await api.createDocument(payload);
        await this.syncDocuments();
        return created;
      } catch (e) {
        console.warn('MongoDB add failed, saving locally:', e);
      }
    }

    // Temporary Browser Storage Fallback when MongoDB is inactive
    const localDoc = {
      id: 'dts-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      ...payload,
      syncedToMongo: false,
      isOffline: true,
      createdAt: new Date().toISOString()
    };
    this.documents.unshift(localDoc);
    this.saveLocalDocs(this.documents);
    return localDoc;
  }

  async updateDocument(id, updatedFields) {
    const currentUsername = this.currentUser ? this.currentUser.username.toLowerCase().trim() : 'system';

    if (this.isServerOnline && this.isMongoConnected) {
      try {
        const updated = await api.updateDocument(id, { ...updatedFields, createdBy: currentUsername });
        await this.syncDocuments();
        return updated;
      } catch (e) {
        console.warn('MongoDB update failed, updating locally:', e);
      }
    }

    // Temporary Browser Storage Update
    const index = this.documents.findIndex(d => d.id === id);
    if (index !== -1) {
      this.documents[index] = {
        ...this.documents[index],
        ...updatedFields,
        createdBy: currentUsername,
        syncedToMongo: false,
        updatedAt: new Date().toISOString()
      };
      this.saveLocalDocs(this.documents);
      return this.documents[index];
    }
    return null;
  }

  async deleteDocument(id) {
    if (this.isServerOnline && this.isMongoConnected) {
      try {
        await api.deleteDocument(id);
        await this.syncDocuments();
        return;
      } catch (e) {
        console.warn('MongoDB delete failed, deleting locally:', e);
      }
    }

    // Temporary Browser Storage Delete
    this.documents = this.documents.filter(d => d.id !== id);
    this.saveLocalDocs(this.documents);
  }

  async deleteBatch(ids) {
    if (this.isServerOnline && this.isMongoConnected) {
      try {
        await api.deleteBatch(ids);
        await this.syncDocuments();
        return;
      } catch (e) {
        console.warn('MongoDB batch delete failed, deleting locally:', e);
      }
    }

    // Temporary Browser Storage Batch Delete
    const idSet = new Set(ids);
    this.documents = this.documents.filter(d => !idSet.has(d.id));
    this.saveLocalDocs(this.documents);
  }

  async saveDocuments(docs, replace = true) {
    const currentUsername = this.currentUser ? this.currentUser.username.toLowerCase().trim() : 'system';
    const formattedDocs = docs.map(d => ({ ...d, createdBy: currentUsername }));

    if (this.isServerOnline && this.isMongoConnected) {
      try {
        await api.batchImport(formattedDocs, replace);
        const remoteDocs = await api.fetchDocuments();
        this.documents = remoteDocs.map(r => ({ ...r, createdBy: currentUsername, syncedToMongo: true }));
        this.saveLocalDocs(this.documents);
        return;
      } catch (e) {
        console.warn('MongoDB import failed, saving locally:', e);
      }
    }

    const taggedDocs = formattedDocs.map(d => ({
      ...d,
      id: d.id || ('dts-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
      syncedToMongo: false,
      createdBy: currentUsername
    }));

    if (replace) {
      this.saveLocalDocs(taggedDocs);
    } else {
      this.saveLocalDocs([...taggedDocs, ...this.documents]);
    }
  }

  async loadSampleAssetCSV() {
    const parsed = parseCSV(RAW_ASSET_CSV);
    await this.saveDocuments(parsed, true);
    return parsed.length;
  }

  generateTrackingNo() {
    const prefix = '00' + Math.floor(10 + Math.random() * 90);
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${dateStr}${randomSuffix}`;
  }

  getTheme() {
    return this.theme;
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  /**
   * Client-side HTML5 Canvas Image Compression helper.
   * Resizes image to fit maxDim (default 1600px) and applies JPEG quality (default 0.70)
   * returning lightweight base64 Data URL string (~150KB per page).
   */
  async compressImage(input, maxDim = 1600, quality = 0.70) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err || new Error('Failed to load image for compression'));

      if (typeof input === 'string') {
        img.src = input;
      } else if (input instanceof Blob || input instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(input);
      } else {
        reject(new Error('Invalid image input'));
      }
    });
  }

  /**
   * Primary lookup: find a scanned document linked to a DTS document by its unique ID.
   * This is the correct linking mechanism that works even for docs with trackingNo='NONE'.
   */
  getScannedDocByLinkedDocId(docId) {
    if (!docId) return null;
    const norm = String(docId).trim();
    return this.scannedDocuments.find(d => d.linkedDocId && String(d.linkedDocId).trim() === norm) || null;
  }

  /**
   * Legacy fallback: find a scanned document by DTS tracking number match.
   * Only used for backward-compatibility with scanned docs saved before linkedDocId was introduced.
   */
  getScannedDocByTrackingNo(trackingNo) {
    if (!trackingNo || String(trackingNo).toUpperCase() === 'NONE') return null;
    const norm = String(trackingNo).trim().toLowerCase();
    return this.scannedDocuments.find(d => d.trackingNo && String(d.trackingNo).trim().toLowerCase() === norm) || null;
  }

  getScannedStorageKey() {
    const username = this.currentUser ? this.currentUser.username.toLowerCase().trim() : 'guest';
    return `dts_scanned_docs_${username}_v1`;
  }

  loadLocalScannedDocs() {
    try {
      const raw = localStorage.getItem(this.getScannedStorageKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveLocalScannedDocs(docs) {
    try {
      localStorage.setItem(this.getScannedStorageKey(), JSON.stringify(docs));
      this.scannedDocuments = docs;
    } catch (e) {
      console.warn('LocalStorage full for scanned docs:', e);
    }
  }

  async syncScannedDocuments(dateFilter = '') {
    if (!this.currentUser) {
      this.scannedDocuments = [];
      return [];
    }

    if (this.isServerOnline) {
      try {
        const remoteDocs = await api.fetchScannedDocuments(dateFilter);
        this.scannedDocuments = remoteDocs;
        this.saveLocalScannedDocs(remoteDocs);
        return remoteDocs;
      } catch (err) {
        console.warn('Failed to fetch scanned documents online, falling back to local:', err.message);
      }
    }

    let docs = this.loadLocalScannedDocs();
    if (dateFilter) docs = docs.filter(d => d.date === dateFilter);
    this.scannedDocuments = docs;
    return docs;
  }

  async addScannedDocument(docData) {
    if (this.isServerOnline) {
      try {
        const created = await api.createScannedDocument(docData);
        this.scannedDocuments.unshift(created);
        this.saveLocalScannedDocs(this.scannedDocuments);
        return created;
      } catch (err) {
        console.warn('Failed to save scanned document online, saving locally:', err.message);
      }
    }

    const localDoc = {
      id: `scanned_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...docData,
      createdAt: new Date().toISOString()
    };
    this.scannedDocuments.unshift(localDoc);
    this.saveLocalScannedDocs(this.scannedDocuments);
    return localDoc;
  }

  async deleteScannedDocument(id) {
    if (this.isServerOnline) {
      try {
        await api.deleteScannedDocument(id);
      } catch (err) {
        console.warn('Failed to delete scanned document on server:', err.message);
      }
    }

    this.scannedDocuments = this.scannedDocuments.filter(d => d.id !== id);
    this.saveLocalScannedDocs(this.scannedDocuments);
  }

  async deleteBatchScannedDocuments(ids) {
    if (this.isServerOnline) {
      try {
        await api.deleteBatchScannedDocuments(ids);
      } catch (err) {
        console.warn('Failed to batch delete scanned documents on server:', err.message);
      }
    }

    this.scannedDocuments = this.scannedDocuments.filter(d => !ids.includes(d.id));
    this.saveLocalScannedDocs(this.scannedDocuments);
  }
}

export const store = new DTSStore();
