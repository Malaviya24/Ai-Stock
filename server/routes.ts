import * as fs from "fs";
import * as path from "path";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema, insertPortfolioSchema, insertTradeSchema } from "@shared/schema";
import { getStockQuote, getHistoricalData, getQuoteSummary, getBulkQuotes } from "./marketService";
import {
  calculateRSI,
  calculateDMA,
  calculateSRTV,
  calculateAIScore,
  calculateCapitalAllocation,
  calculateBIOSZone,
  checkAvoidRule,
  calculateDMASignal,
  calculateCAR,
  calculateCompounding,
  aggregateMonthly,
  analyzeExpiryCandle,
} from "./indicators";
import { log } from "./index";

// Progress trackers (in-memory)
let LTVI_PROGRESS: {
  total: number;
  processed: number;
  stage: "idle" | "parsing" | "fetching" | "ranking" | "complete" | "error";
  startedAt?: string;
  finishedAt?: string;
  message?: string;
} = { total: 0, processed: 0, stage: "idle" };

const NIFTY_50_SYMBOLS = [
  "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
  "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BPCL.NS", "BHARTIARTL.NS",
  "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DIVISLAB.NS", "DRREDDY.NS",
  "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS", "HDFCLIFE.NS",
  "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS", "INDUSINDBK.NS",
  "INFY.NS", "ITC.NS", "JSWSTEEL.NS", "KOTAKBANK.NS", "LT.NS",
  "LTIM.NS", "M&M.NS", "MARUTI.NS", "NESTLEIND.NS", "NTPC.NS",
  "ONGC.NS", "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SBIN.NS",
  "SUNPHARMA.NS", "TATACONSUM.NS", "TMPV.NS", "TATASTEEL.NS", "TCS.NS",
  "TECHM.NS", "TITAN.NS", "ULTRACEMCO.NS", "WIPRO.NS", "ZOMATO.NS"
];

const NIFTY_TOP_15_SYMBOLS = [
  "RELIANCE.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "SBIN.NS",
  "INFY.NS",
  "TCS.NS",
  "BHARTIARTL.NS",
  "ITC.NS",
  "LT.NS",
  "KOTAKBANK.NS",
  "AXISBANK.NS",
  "HINDUNILVR.NS",
  "BAJFINANCE.NS",
  "MARUTI.NS",
  "SUNPHARMA.NS",
];

// ======================== CLASS 5 — SRTV ETF SCANNER UNIVERSE ========================
const NSE_ETF_UNIVERSE = [
  { symbol: "PSUBNKIETF.NS", underlying: "ICICI Prudential Nifty PSU Bank ETF" },
  { symbol: "PSUBNKBEES.NS", underlying: "Nifty PSU Bank" },
  { symbol: "PSUBANKADD.NS", underlying: "DSP Nifty PSU Bank ETF" },
  { symbol: "HDFCPSUBK.NS", underlying: "HDFC NIFTY PSU BANK ETF" },
  { symbol: "MAFANG.NS", underlying: "NYSE FANG+ Total Return Index" },
  { symbol: "MOREALTY.NS", underlying: "Motilal Oswal Nifty Realty ETF" },
  { symbol: "MONQ50.NS", underlying: "Nasdaq Q-50 Total Return Index" },
  { symbol: "MASPTOP50.NS", underlying: "S&P 500 Top 50 Total Return Index" },
  { symbol: "ABSLBANETF.NS", underlying: "Nifty Bank" },
  { symbol: "INFRABEES.NS", underlying: "Nifty Infra" },
  { symbol: "SBIETFPB.NS", underlying: "Nifty Private Bank Index" },
  { symbol: "PVTBANIETF.NS", underlying: "Nifty Private Bank Index" },
  { symbol: "PVTBANKADD.NS", underlying: "DSP Nifty Private Bank ETF" },
  { symbol: "INFRAIETF.NS", underlying: "ICICI Prudential Nifty Infrastructure ETF" },
  { symbol: "HDFCPVTBAN.NS", underlying: "HDFC NIFTY Private Bank ETF" },
  { symbol: "HDFCNIFBAN.NS", underlying: "Nifty Bank" },
  { symbol: "BANKBETF.NS", underlying: "Bajaj Finserv Nifty Bank ETF" },
  { symbol: "UTIBANKETF.NS", underlying: "Nifty Bank" },
  { symbol: "BANKIETF.NS", underlying: "Nifty Bank" },
  { symbol: "BANKETFADD.NS", underlying: "DSP Nifty Bank ETF" },
  { symbol: "BANKETF.NS", underlying: "Mirae Asset Nifty Bank ETF" },
  { symbol: "BANKBEES.NS", underlying: "Nifty Bank" },
  { symbol: "SETFNIFBK.NS", underlying: "Nifty Bank" },
  { symbol: "BANKNIFTY1.NS", underlying: "Nifty Bank" },
  { symbol: "ALPHAETF.NS", underlying: "Mirae Asset Nifty 200 Alpha 30 ETF" },
  { symbol: "SMALLCAP.NS", underlying: "Mirae Asset Nifty Smallcap 250 Momentum Quality 100 ETF" },
  { symbol: "MON100.NS", underlying: "Nasdaq100" },
  { symbol: "CPSEETF.NS", underlying: "CPSE ETF" },
  { symbol: "GOLDETFADD.NS", underlying: "DSP Gold ETF" },
  { symbol: "ICICIB22.NS", underlying: "S&P BSE BHARAT 22 index" },
  { symbol: "MOVALUE.NS", underlying: "Motilal Oswal S&P BSE Enhanced Value ETF" },
  { symbol: "SETFGOLD.NS", underlying: "Gold" },
  { symbol: "HDFCGOLD.NS", underlying: "Gold" },
  { symbol: "QGOLDHALF.NS", underlying: "Gold" },
  { symbol: "BSLGOLDETF.NS", underlying: "Gold" },
  { symbol: "BFSI.NS", underlying: "Nifty Financial Services Index" },
  { symbol: "GOLDIETF.NS", underlying: "Gold" },
  { symbol: "GOLDCASE.NS", underlying: "Zerodha Gold ETF" },
  { symbol: "GOLDETF.NS", underlying: "Mirae Asset Gold ETF" },
  { symbol: "GOLDSHARE.NS", underlying: "Gold" },
  { symbol: "GOLDBEES.NS", underlying: "Gold" },
  { symbol: "GOLD1.NS", underlying: "Gold" },
  { symbol: "TATAGOLD.NS", underlying: "Tata Gold Exchange Traded Fund" },
  { symbol: "AXISGOLD.NS", underlying: "Gold" },
  { symbol: "COMMOIETF.NS", underlying: "ICICI Prudential Nifty Commodities ETF" },
  { symbol: "MOM30IETF.NS", underlying: "ICICI Prudential Nifty 200 Momentum 30 ETF" },
  { symbol: "MOMOMENTUM.NS", underlying: "Nifty 200 Momentum 30 Total Return Index" },
  { symbol: "HDFCMOMENT.NS", underlying: "HDFC NIFTY200 Momentum 30 ETF" },
  { symbol: "MOMENTUM.NS", underlying: "Aditya Birla Sun Life Nifty 200 Momentum 30 ETF" },
  { symbol: "MOLOWVOL.NS", underlying: "Nifty Midcap 100 TRI" },
  { symbol: "ALPHA.NS", underlying: "NIFTY Alpha 50 Index" },
  { symbol: "SILVERETF.NS", underlying: "UTI Silver Exchange Traded Fund (UTI Silver ETF)" },
  { symbol: "HDFCSENSEX.NS", underlying: "SENSEX" },
  { symbol: "AXISNIFTY.NS", underlying: "Nifty 50" },
  { symbol: "NIF100IETF.NS", underlying: "Nifty 100" },
  { symbol: "NIFTY50ADD.NS", underlying: "Nifty 50 Index" },
  { symbol: "HDFCBSE500.NS", underlying: "HDFC S&P BSE 500 ETF" },
  { symbol: "NIF100BEES.NS", underlying: "Nifty 100 TRI" },
  { symbol: "NIFTYETF.NS", underlying: "Nifty 50" },
  { symbol: "UTINIFTETF.NS", underlying: "Nifty 50" },
  { symbol: "NIFTY1.NS", underlying: "Nifty 50" },
  { symbol: "HDFCNIF100.NS", underlying: "HDFC NIFTY 100 ETF" },
  { symbol: "HDFCNIFTY.NS", underlying: "Nifty 50" },
  { symbol: "SETFNIF50.NS", underlying: "Nifty 50" },
  { symbol: "NIFTYBEES.NS", underlying: "Nifty 50" },
  { symbol: "BSLNIFTY.NS", underlying: "Nifty 50" },
  { symbol: "NIFTYIETF.NS", underlying: "Nifty 50" },
  { symbol: "BSE500IETF.NS", underlying: "S&P BSE 500 index" },
  { symbol: "ESG.NS", underlying: "NIFTY100 ESG SECTOR LEADERS" },
  { symbol: "AUTOBEES.NS", underlying: "Nifty Auto TRI" },
  { symbol: "NEXT50IETF.NS", underlying: "Nifty Next 50" },
  { symbol: "JUNIORBEES.NS", underlying: "Nifty Next 50" },
  { symbol: "ABSLNN50ET.NS", underlying: "Nifty Next 50" },
  { symbol: "AUTOIETF.NS", underlying: "Nifty Auto Index" },
  { symbol: "ESILVER.NS", underlying: "Edelweiss Silver ETF" },
  { symbol: "MID150BEES.NS", underlying: "Nifty Midcap 150 TRI" },
  { symbol: "TATSILV.NS", underlying: "Tata Silver Exchange Traded Fund" },
  { symbol: "UTINEXT50.NS", underlying: "Nifty Next 50" },
  { symbol: "MIDCAPETF.NS", underlying: "Mirae Asset Mutual Fund - Mirae Asset Nifty Midcap 150 ETF" },
  { symbol: "MAKEINDIA.NS", underlying: "Nifty India Manufacturing Total Return Index" },
  { symbol: "HDFCSILVER.NS", underlying: "HDFC Silver ETF" },
  { symbol: "MIDCAPIETF.NS", underlying: "Nifty Midcap 150" },
  { symbol: "NEXT50.NS", underlying: "Nifty Next 50" },
  { symbol: "SILVER.NS", underlying: "Physical price of Silver" },
  { symbol: "AXISILVER.NS", underlying: "Axis Silver ETF" },
  { symbol: "SILVER1.NS", underlying: "Kotak Silver ETF" },
  { symbol: "SETFNN50.NS", underlying: "Nifty Next 50" },
  { symbol: "HDFCNEXT50.NS", underlying: "HDFC NIFTY NEXT 50 ETF" },
  { symbol: "SILVRETF.NS", underlying: "Mirae Asset Silver ETF" },
  { symbol: "SILVERBEES.NS", underlying: "Domestic price of Silver- based on LBMA Silver daily spot fixing price" },
  { symbol: "MOM100.NS", underlying: "Nifty Midcap 100" },
  { symbol: "SILVERIETF.NS", underlying: "Domestic Price of Silver" },
  { symbol: "HDFCMID150.NS", underlying: "HDFC NIFTY Midcap 150 ETF" },
  { symbol: "MIDCAP.NS", underlying: "Nifty Midcap 50 Index" },
  { symbol: "HDFCSML250.NS", underlying: "HDFC NIFTY Smallcap 250 ETF" },
  { symbol: "MOSMALL250.NS", underlying: "Motilal Oswal Nifty Smallcap 250 ETF" },
  { symbol: "MONIFTY500.NS", underlying: "Motilal Oswal Nifty 500 ETF" },
  { symbol: "ALPL30IETF.NS", underlying: "Nifty Alpha Low-Volatility 30 Index" },
  { symbol: "EQUAL50ADD.NS", underlying: "NIFTY 50 Equal Weight Index" },
  { symbol: "MIDSELIETF.NS", underlying: "S&P BSE Midcap Select Index" },
  { symbol: "DIVOPPBEES.NS", underlying: "Nifty Dividend Opportunities 50 TRI" },
  { symbol: "MNC.NS", underlying: "Kotak Nifty MNC ETF" },
  { symbol: "LICNMID100.NS", underlying: "LIC MF Nifty Midcap 100 ETF" },
  { symbol: "LOWVOLIETF.NS", underlying: "Nifty 100 Low Volatility 30 Index" },
  { symbol: "HDFCLOWVOL.NS", underlying: "HDFC NIFTY100 Low Volatility 30 ETF" },
  { symbol: "NV20BEES.NS", underlying: "Nifty50 Value20 TRI" },
  { symbol: "NV20.NS", underlying: "Nifty50 Value 20" },
  { symbol: "NV20IETF.NS", underlying: "Nifty50 Value 20" },
  { symbol: "FMCGIETF.NS", underlying: "Nifty FMCG Index" },
  { symbol: "HDFCVALUE.NS", underlying: "HDFC NIFTY50 Value 20 ETF" },
  { symbol: "FINIETF.NS", underlying: "ICICI Prudential Nifty Financial Services Ex-Bank ETF" },
  { symbol: "QUAL30IETF.NS", underlying: "ICICI Prudential Nifty 200 Quality 30 ETF" },
  { symbol: "LOWVOL1.NS", underlying: "Kotak Nifty 100 Low Vol 30 ETF" },
  { symbol: "NIFTYQLITY.NS", underlying: "Aditya Birla Sun Life Nifty 200 Quality 30 ETF" },
  { symbol: "CONSUMBEES.NS", underlying: "Nifty India Consumption TRI" },
  { symbol: "CONSUMIETF.NS", underlying: "Nifty India Consumption Index" },
  { symbol: "SBIETFCON.NS", underlying: "Nifty India Consumption Index" },
  { symbol: "TNIDETF.NS", underlying: "Nifty India Digital Index" },
  { symbol: "HEALTHIETF.NS", underlying: "Nifty Healthcare Index" },
  { symbol: "HEALTHY.NS", underlying: "Nifty Healthcare TRI" },
  { symbol: "AXISHCETF.NS", underlying: "Nifty Healthcare Index" },
  { symbol: "PHARMABEES.NS", underlying: "Nifty Pharma TRI" },
  { symbol: "ITETFADD.NS", underlying: "DSP Nifty IT ETF" },
  { symbol: "ITIETF.NS", underlying: "Nifty IT Index" },
  { symbol: "ITBEES.NS", underlying: "Nifty IT TRI" },
  { symbol: "ITETF.NS", underlying: "Mirae Asset Nifty IT ETF" },
  { symbol: "TECH.NS", underlying: "Nifty IT TRI Index" },
  { symbol: "MOHEALTH.NS", underlying: "Motilal Oswal S&P BSE Healthcare ETF" },
  { symbol: "SBIETFIT.NS", underlying: "Nifty IT Index" },
  { symbol: "IT.NS", underlying: "NIFTY IT Index" },
  { symbol: "HDFCNIFIT.NS", underlying: "HDFC NIFTY IT ETF" },
  { symbol: "HNGSNGBEES.NS", underlying: "Hang Seng Index" },
  { symbol: "MAHKTECH.NS", underlying: "Hang Seng TECH Total Return Index" },
  { symbol: "ICICINXT50.NS", underlying: "Nifty Next 50" },
  { symbol: "HABORETF.NS", underlying: "Nifty 100" },
  { symbol: "PSUBANK.NS", underlying: "Nifty PSU Bank" },
];

const NIFTY_NEXT_50_SYMBOLS = [
  "ABB.NS", "ABCAPITAL.NS", "ADANIGREEN.NS", "ADANIPOWER.NS", "ATUL.NS",
  "AUROPHARMA.NS", "BANKBARODA.NS", "BEL.NS", "BERGEPAINT.NS", "BIOCON.NS",
  "BOSCHLTD.NS", "CANBK.NS", "CHOLAFIN.NS", "COLPAL.NS", "CONCOR.NS",
  "DLF.NS", "DMART.NS", "GAIL.NS", "GODREJCP.NS", "HAL.NS",
  "HAVELLS.NS", "HINDZINC.NS", "ICICIGI.NS", "ICICIPRULI.NS", "IDFCFIRSTB.NS",
  "INDIGO.NS", "IOC.NS", "IRFC.NS", "JINDALSTEL.NS", "JIOFIN.NS",
  "JUBLFOOD.NS", "LICI.NS", "LUPIN.NS", "MARICO.NS", "UNITDSPR.NS",
  "MPHASIS.NS", "MRF.NS", "MUTHOOTFIN.NS", "NAUKRI.NS", "NMDC.NS",
  "PAGEIND.NS", "PFC.NS", "PIDILITIND.NS", "PNB.NS", "RECLTD.NS",
  "RVNL.NS", "SHREECEM.NS", "SIEMENS.NS", "SRF.NS", "TATAPOWER.NS",
  "TORNTPHARM.NS", "TRENT.NS", "TVSMOTOR.NS", "VBL.NS", "VEDL.NS"
];

const NIFTY_100_SYMBOLS = [...NIFTY_50_SYMBOLS, ...NIFTY_NEXT_50_SYMBOLS];

const NIFTY_LARGEMIDCAP_EXTRA = [
  "AMBUJACEM.NS", "BOSCHLTD.NS", "CHOLAFIN.NS", "COLPAL.NS",
  "CUMMINSIND.NS", "DEEPAKNTR.NS", "DIXON.NS", "GLAND.NS", "GODREJPROP.NS",
  "HDFCAMC.NS", "IEX.NS", "INDHOTEL.NS", "JUBLFOOD.NS",
  "MUTHOOTFIN.NS", "NAVINFLUOR.NS", "OBEROIRLTY.NS", "OFSS.NS", "PEL.NS",
  "PERSISTENT.NS", "PETRONET.NS", "PIIND.NS", "POLYCAB.NS", "PRESTIGE.NS",
  "SONACOMS.NS", "STARHEALTH.NS", "SUNDARMFIN.NS", "SUPREMEIND.NS", "SUNTV.NS",
  "TATACHEM.NS", "TIMKEN.NS", "TORNTPOWER.NS", "UBL.NS", "IDEA.NS", "YESBANK.NS", "INDIANB.NS"
];

const NIFTY_LARGEMIDCAP_250_SYMBOLS = [
  "ABB.NS", "ACC.NS", "AIAENG.NS", "APLAPOLLO.NS", "AUBANK.NS", "AARTIIND.NS", "AAVAS.NS", "ABBOTINDIA.NS", "ACE.NS", "ADANIENSOL.NS",
  "ADANIENT.NS", "ADANIGREEN.NS", "ADANIPORTS.NS", "ADANIPOWER.NS", "ATGL.NS", "AWL.NS", "ABCAPITAL.NS", "ABFRL.NS", "AEGISLOG.NS", "AETHER.NS",
  "AFFLE.NS", "AJANTPHARM.NS", "ALEMBICLTD.NS", "APLLTD.NS", "ALKEM.NS", "ALKYLAMINE.NS", "ALLCARGO.NS", "ALOKINDS.NS", "AMBER.NS", "AMBUJACEM.NS",
  "ANURAS.NS", "ANGELONE.NS", "ANUPAM.NS", "APARINDS.NS", "APOLLOHOSP.NS", "APOLLOTYRE.NS", "APTUS.NS", "ACI.NS", "ASAHIINDIA.NS", "ASHOKLEY.NS",
  "ASIANPAINT.NS", "ASTERDM.NS", "ASTRAL.NS", "ATUL.NS", "AUROPHARMA.NS", "AVANTIFEED.NS", "DMART.NS", "AXISBANK.NS", "BASF.NS", "BEML.NS",
  "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BAJAJHLDNG.NS", "BALAMINES.NS", "BALKRISIND.NS", "BALRAMCHIN.NS", "BANDHANBNK.NS", "BANKBARODA.NS", "BANKINDIA.NS",
  "MAHABANK.NS", "BATAINDIA.NS", "BAYERCROP.NS", "BERGEPAINT.NS", "BDL.NS", "BEL.NS", "BHARATFORG.NS", "BHEL.NS", "BPCL.NS", "BHARTIARTL.NS",
  "BIOCON.NS", "BIRLACORPN.NS", "BSOFT.NS", "BLUEDART.NS", "BLUESTARCO.NS", "BBTC.NS", "BOSCHLTD.NS", "BRIGADE.NS", "BCG.NS", "BRITANNIA.NS",
  "MAPMYINDIA.NS", "CCL.NS", "CESC.NS", "CGPOWER.NS", "CRISIL.NS", "CSBBANK.NS", "CAMPUS.NS", "CANFINHOME.NS", "CANBK.NS", "CAPLIPOINT.NS",
  "CGCL.NS", "CARBORUNIV.NS", "CASTROLIND.NS", "CEATLTD.NS", "CENTRALBK.NS", "CDSL.NS", "CENTURYPLY.NS", "CERA.NS", "CHALET.NS", "CHAMBLFERT.NS",
  "CHEMPLASTS.NS", "CHOLAHLDNG.NS", "CHOLAFIN.NS", "CIPLA.NS", "CUB.NS", "CLEAN.NS", "COALINDIA.NS", "COCHINSHIP.NS", "COFORGE.NS", "COLPAL.NS",
  "CAMS.NS", "CONCOR.NS", "COROMANDEL.NS", "CRAFTSMAN.NS", "CREDITACC.NS", "CROMPTON.NS", "CUMMINSIND.NS", "CYIENT.NS", "DCMSHRIRAM.NS", "DLF.NS",
  "DABUR.NS", "DALBHARAT.NS", "DEEPAKFERT.NS", "DEEPAKNTR.NS", "DELHIVERY.NS", "DELTACORP.NS", "DEVYANI.NS", "DIVISLAB.NS", "DIXON.NS", "LALPATHLAB.NS",
  "DRREDDY.NS", "EIDPARRY.NS", "EIHOTEL.NS", "EPL.NS", "EASEMYTRIP.NS", "EICHERMOT.NS", "ELGIEQUIP.NS", "EMAMILTD.NS", "ENDURANCE.NS", "ENGINERSIN.NS",
  "EQUITASBNK.NS", "ERIS.NS", "ESCORTS.NS", "EXIDEIND.NS", "FDC.NS", "NYKAA.NS", "FEDERALBNK.NS", "FACT.NS", "FINEORG.NS", "FINCABLES.NS",
  "FINPIPE.NS", "FSL.NS", "FORTIS.NS", "GAIL.NS", "GMMPFAUDLR.NS", "GMRINFRA.NS", "GRSE.NS", "GICRE.NS", "GILLETTE.NS", "GLAND.NS",
  "GLAXO.NS", "GLENMARK.NS", "MEDANTA.NS", "GOCOLORS.NS", "GODFRYPHLP.NS", "GODREJAGRO.NS", "GODREJCP.NS", "GODREJIND.NS", "GODREJPROP.NS", "GRANULES.NS",
  "GRAPHITE.NS", "GRASIM.NS", "GESHIP.NS", "GRINDWELL.NS", "GUJALKALI.NS", "GAEL.NS", "FLUOROCHEM.NS", "GUJGASLTD.NS", "GNFC.NS", "GPPL.NS",
  "GSFC.NS", "GSPL.NS", "HEG.NS", "HCLTECH.NS", "HDFCAMC.NS", "HDFCBANK.NS", "HDFCLIFE.NS", "HFCL.NS", "HLEGLAS.NS", "HAPPSTMNDS.NS",
  "HAVELLS.NS", "HEROMOTOCO.NS", "HINDALCO.NS", "HAL.NS", "HINDCOPPER.NS", "HINDPETRO.NS", "HINDUNILVR.NS", "HINDZINC.NS", "HITECH.NS", "HOMEFIRST.NS",
  "HONAUT.NS", "HUDCO.NS", "HDFC.NS", "ICICIBANK.NS", "ICICIGI.NS", "ICICIPRULI.NS", "IDBI.NS", "IDFC.NS", "IDFCFIRSTB.NS", "IFBIND.NS",
  "IIFL.NS", "IRB.NS", "IRCON.NS", "ITC.NS", "ITI.NS", "INDIACEM.NS", "IBULHSGFIN.NS", "INDIAMART.NS", "INDIANB.NS", "IEX.NS",
  "INDHOTEL.NS", "IOC.NS", "IOB.NS", "IRCTC.NS", "IRFC.NS", "INDIGOPNTS.NS", "IGL.NS", "INDUSTOWER.NS", "INDUSINDBK.NS", "INFY.NS",
  "INOXLEISUR.NS", "INTELLECT.NS", "INDIGO.NS", "IPCALAB.NS", "JBCHEPHARM.NS", "JKCEMENT.NS", "JKLAKSHMI.NS", "JKPAPER.NS", "JMFINANCIL.NS", "JSWENERGY.NS",
  "JSWSTEEL.NS", "JAMNAAUTO.NS", "JINDALSAW.NS", "JSL.NS", "JINDALSTEL.NS", "JIOFIN.NS", "JUBLFOOD.NS", "JUBLINGREA.NS", "JUBLPHARMA.NS", "JUSTDIAL.NS",
  "JYOTHYLAB.NS", "KPRMILL.NS", "KEI.NS", "KNRCON.NS", "KPITTECH.NS", "KRBL.NS", "KSB.NS", "KAJARIACER.NS", "KALPATPOWR.NS", "KALYANKJIL.NS",
  "KANSAINER.NS", "KARURVYSYA.NS", "KEC.NS", "KOTAKBANK.NS", "KIMS.NS", "L&TFH.NS", "LT.NS", "LTTS.NS", "LICHSGFIN.NS", "LTIM.NS",
  "LAXMIMACH.NS", "LICI.NS", "LINDEINDIA.NS", "LUPIN.NS", "LUXIND.NS", "MMTC.NS", "MOIL.NS", "MRF.NS", "MGL.NS", "M&MFIN.NS",
  "M&M.NS", "MAHINDCIE.NS", "MAHLOG.NS", "MANAPPURAM.NS", "MRPL.NS", "MARICO.NS", "MARUTI.NS", "MASTEK.NS", "MFSL.NS", "MAXHEALTH.NS",
  "MAZAGONDOC.NS", "METROBRAND.NS", "METROPOLIS.NS", "MINDTREE.NS", "MISHRA.NS", "MOTILALOFS.NS", "MPHASIS.NS", "MCX.NS", "MUTHOOTFIN.NS", "NATCOPHARM.NS",
  "NBCC.NS", "NCC.NS", "NESCO.NS", "NHPC.NS", "NLCINDIA.NS", "NMDC.NS", "NOCIL.NS", "NTPC.NS", "NH.NS", "NATIONALUM.NS",
  "NAVINFLUOR.NS", "NAZARA.NS", "NESTLEIND.NS", "NAM-INDIA.NS", "OBEROIRLTY.NS", "ONGC.NS", "OIL.NS", "ONE97.NS", "OFSS.NS", "ORIENTELEC.NS",
  "POLICYBZR.NS", "PCBL.NS", "PIIND.NS", "PNBHOUSING.NS", "PNCINFRA.NS", "PVR.NS", "PAGEIND.NS", "PATANJALI.NS", "PERSISTENT.NS", "PETRONET.NS",
  "PFIZER.NS", "PHOENIXLTD.NS", "PIDILITIND.NS", "PEL.NS", "PPLPHARMA.NS", "POLYMED.NS", "POLYCAB.NS", "POLYPLEX.NS", "POONAWALLA.NS", "PFC.NS",
  "POWERGRID.NS", "PRAJIND.NS", "PRESTIGE.NS", "PRINCEPIPE.NS", "PRSMJOHNSN.NS", "PGHH.NS", "PNB.NS", "QUESS.NS", "RBLBANK.NS", "RECLTD.NS",
  "RHIM.NS", "RITES.NS", "RADICO.NS", "RVNL.NS", "RAILTEL.NS", "RAIN.NS", "RAJESHEXPO.NS", "RALLIS.NS", "RAMCOCEM.NS", "RCF.NS",
  "RATNAMANI.NS", "RAYMOND.NS", "REDINGTON.NS", "RELIANCE.NS", "RELAXO.NS", "ROUTE.NS", "SBICARD.NS", "SBILIFE.NS", "SIS.NS", "SJVN.NS",
  "SKFINDIA.NS", "SRF.NS", "SANOFI.NS", "SAPPHIRE.NS", "SCHAEFFLER.NS", "SHARDACROP.NS", "SHREECEM.NS", "RENUKA.NS", "SHRIRAMFIN.NS", "SHYAMMETL.NS",
  "SIEMENS.NS", "SOBHA.NS", "SOLARINDS.NS", "SONACOMS.NS", "SONATSOFTW.NS", "STARHEALTH.NS", "SBIN.NS", "SAIL.NS", "SWSOLAR.NS", "STLTECH.NS",
  "STAR.NS", "SUDARSCHEM.NS", "SUMICHEM.NS", "SPARC.NS", "SUNPHARMA.NS", "SUNTV.NS", "SUNDARMFIN.NS", "SUNDRMFAST.NS", "SUNTECK.NS", "SUPRAJIT.NS",
  "SUPREMEIND.NS", "SUVENPHAR.NS", "SUZLON.NS", "SYMPHONY.NS", "SYNGENE.NS", "TCIEXP.NS", "TCNSBRANDS.NS", "TTKPRESTIG.NS", "TV18BRDCST.NS", "TVSMOTOR.NS",
  "TANLA.NS", "TATACHEM.NS", "TATACOMM.NS", "TCS.NS", "TATACONSUM.NS", "TATAELXSI.NS", "TATAINVEST.NS", "TATAMOTORS.NS", "TATAPOWER.NS", "TATASTEEL.NS",
  "TTML.NS", "TEAMLEASE.NS", "TECHM.NS", "TEJASNET.NS", "NIACL.NS", "RAMCOIND.NS", "THERMAX.NS", "TIMKEN.NS", "TITAN.NS", "TORNTPHARM.NS",
  "TORNTPOWER.NS", "TRENT.NS", "TRIDENT.NS", "TRIVENI.NS", "TRITURBINE.NS", "TIINDIA.NS", "UCOBANK.NS", "UFLEX.NS", "UNOMINDA.NS", "UPL.NS",
  "UTIAMC.NS", "ULTRACEMCO.NS", "UNIONBANK.NS", "UBL.NS", "MCDOWELL-N.NS", "VGUARD.NS", "VMART.NS", "VIPIND.NS", "VAIBHAVGBL.NS", "VAKRANGEE.NS",
  "VARDHMAN.NS", "VARROC.NS", "VBL.NS", "VEDL.NS", "VENKEYS.NS", "VIJAYA.NS", "VINATIORGA.NS", "IDEA.NS", "VOLTAS.NS", "WHIRLPOOL.NS",
  "WIPRO.NS", "WOCKPHARMA.NS", "YESBANK.NS", "ZEEL.NS", "ZENSARTECH.NS", "ZOMATO.NS", "ZYDUSLIFE.NS", "ZYDUSWELL.NS", "ECLERX.NS"
];

const REIT_INVIT_SYMBOLS: {
  symbol: string;
  type: "REIT" | "INVIT";
  name: string;
  bseCode: string;
}[] = [
    { symbol: "IRBINVIT.NS", type: "INVIT", name: "IRB InvIT Fund", bseCode: "BOM:540526" },
    { symbol: "PGINVIT.NS", type: "INVIT", name: "PowerGrid Infrastructure Investment Trust", bseCode: "BOM:543290" },
    { symbol: "NXST.NS", type: "INVIT", name: "Nexus Select Trust", bseCode: "BOM:543913" },
    { symbol: "EMBASSY.NS", type: "REIT", name: "Embassy Office Parks REIT", bseCode: "BOM:542602" },
    { symbol: "BIRET.NS", type: "REIT", name: "Brookfield India Real Estate Trust", bseCode: "BOM:543261" },
    { symbol: "INDUSINVIT.BO", type: "INVIT", name: "Bharat Highways InvIT", bseCode: "BOM:543317" },
    { symbol: "INDIGRID.NS", type: "INVIT", name: "India Grid Trust", bseCode: "BOM:540565" },
    { symbol: "MINDSPACE.NS", type: "REIT", name: "Mindspace Business Parks REIT", bseCode: "BOM:543217" },
  ];

const NIFTY_REIT_INVIT_INDEX = REIT_INVIT_SYMBOLS.map((item) => item.symbol);

const toDateString = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const getIndexInclusion = (symbol: string) => {
  const indices: string[] = [];
  if (NIFTY_REIT_INVIT_INDEX.includes(symbol)) indices.push("NIFTY_REIT_INVIT");
  if (NIFTY_100_SYMBOLS.includes(symbol)) indices.push("NIFTY_100");
  if (NIFTY_LARGEMIDCAP_EXTRA.includes(symbol)) indices.push("NIFTY_LARGEMIDCAP250");
  if (indices.length === 0) indices.push("NOT_IN_NIFTY");
  return indices;
};

const CAPITAL_PARTS = 10;
const DEFAULT_CAPITAL_PER_STOCK = 30000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const get52WeekStats = (data: { date: Date; high: number; low: number }[]) => {
  let high52 = -Infinity;
  let low52 = Infinity;
  let highDate = "";
  let lowDate = "";

  for (const day of data) {
    if (day.high >= high52) {
      high52 = day.high;
      highDate = toDateString(day.date);
    }
    if (day.low <= low52) {
      low52 = day.low;
      lowDate = toDateString(day.date);
    }
  }

  const highDateValue = highDate ? new Date(highDate).getTime() : 0;
  const lowDateValue = lowDate ? new Date(lowDate).getTime() : 0;
  const hasValidDates = highDateValue > 0 && lowDateValue > 0;
  const isGreen = hasValidDates && lowDateValue > highDateValue;

  return {
    high52: Number.isFinite(high52) ? high52 : 0,
    low52: Number.isFinite(low52) ? low52 : 0,
    highDate,
    lowDate,
    zone: isGreen ? "GREEN" : "RED",
    output: isGreen ? "Stock in green zone" : "Stock in red zone",
  };
};

import { niftyDmaService } from "./niftyDmaService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Add this status endpoint at the top to ensure it's not blocked by other routes
  app.get("/api/status/data-source", (_req, res) => {
    res.json({
      source: process.env.SHOONYA_USER_ID ? "SHOONYA" : "YAHOO",
      userId: process.env.SHOONYA_USER_ID || null
    });
  });

  app.get("/api/watchlist", async (_req, res) => {
    try {
      const items = await storage.getWatchlist();
      res.json(items);
    } catch (error: any) {
      log(`Error getting watchlist: ${error.message}`);
      res.status(500).json({ message: "Failed to get watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const parsed = insertWatchlistSchema.parse(req.body);
      const existing = await storage.getWatchlist();
      if (existing.find((item) => item.symbol === parsed.symbol)) {
        return res.status(400).json({ message: "Symbol already in watchlist" });
      }
      const item = await storage.addToWatchlist(parsed);
      res.json(item);
    } catch (error: any) {
      log(`Error adding to watchlist: ${error.message}`);
      res.status(400).json({ message: error.message || "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      log(`Error removing from watchlist: ${error.message}`);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  app.get("/api/market/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      const [quote, historicalData] = await Promise.all([
        getStockQuote(symbol),
        getHistoricalData(symbol),
      ]);

      if (!quote) {
        return res.status(404).json({ message: "Stock not found" });
      }

      const rsi = calculateRSI(historicalData);
      const dma124 = calculateDMA(historicalData, 124);
      const srtv = calculateSRTV(quote.price, dma124);
      res.json({
        quote,
        indicators: {
          symbol,
          rsi,
          dma124,
          srtv,
          currentPrice: quote.price,
        },
      });
    } catch (error: any) {
      log(`Error fetching market data: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  app.get("/api/chart/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      const data = await getHistoricalData(symbol, 6);

      const chartData = data.map((d) => ({
        date: d.date.toISOString(),
        close: d.close,
        high: d.high,
        low: d.low,
        volume: d.volume,
      }));

      res.json(chartData);
    } catch (error: any) {
      log(`Error fetching chart data: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  app.get("/api/scores", async (_req, res) => {
    try {
      const watchlist = await storage.getWatchlist();
      if (watchlist.length === 0) {
        return res.json([]);
      }

      const scores = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const [quote, historicalData] = await Promise.all([
              getStockQuote(item.symbol),
              getHistoricalData(item.symbol),
            ]);

            if (!quote || historicalData.length === 0) {
              return null;
            }

            const rsi = calculateRSI(historicalData);
            const dma124 = calculateDMA(historicalData, 124);
            const srtv = calculateSRTV(quote.price, dma124);

            const avgVolume = historicalData.length > 20
              ? historicalData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20
              : quote.volume;
            const volumeRatio = avgVolume > 0 ? quote.volume / avgVolume : 1;

            const aiScore = calculateAIScore({ rsi, srtv, volumeRatio });

            return {
              symbol: item.symbol,
              name: quote.name,
              totalScore: aiScore.totalScore,
              rsiScore: aiScore.rsiScore,
              srtvScore: aiScore.srtvScore,
              volumeScore: aiScore.volumeScore,
              signal: aiScore.signal,
              currentPrice: quote.price,
              rsi,
              srtv,
            };
          } catch (error: any) {
            log(`Error scoring ${item.symbol}: ${error.message}`);
            return null;
          }
        })
      );

      res.json(scores.filter(Boolean));
    } catch (error: any) {
      log(`Error calculating scores: ${error.message}`);
      res.status(500).json({ message: "Failed to calculate scores" });
    }
  });

  app.get("/api/capital/:totalCapital", async (req, res) => {
    try {
      const totalCapital = parseFloat(req.params.totalCapital);
      if (isNaN(totalCapital) || totalCapital <= 0) {
        return res.status(400).json({ message: "Invalid capital amount" });
      }

      const positions = await storage.getPortfolioPositions();
      const currentExposure = positions
        .filter((p) => p.isActive)
        .reduce((sum, p) => sum + p.entryPrice * p.quantity, 0);

      const allocation = calculateCapitalAllocation(totalCapital, currentExposure);

      res.json({
        totalCapital,
        ...allocation,
      });
    } catch (error: any) {
      log(`Error calculating capital: ${error.message}`);
      res.status(500).json({ message: "Failed to calculate capital allocation" });
    }
  });

  app.get("/api/signals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const strategy = req.query.strategy as string | undefined;
      const sigs = await storage.getSignals(limit, strategy);
      res.json(sigs);
    } catch (error: any) {
      log(`Error getting signals: ${error.message}`);
      res.status(500).json({ message: "Failed to get signals" });
    }
  });

  app.post("/api/scan", async (_req, res) => {
    try {
      await storage.clearSignals();

      const symbolsToScan = NIFTY_100_SYMBOLS.slice(0, 20);
      let count = 0;

      const results = await Promise.allSettled(
        symbolsToScan.map(async (symbol) => {
          try {
            const [quote, historicalData] = await Promise.all([
              getStockQuote(symbol),
              getHistoricalData(symbol),
            ]);

            if (!quote || historicalData.length === 0) return;

            const rsi = calculateRSI(historicalData);
            const dma124 = calculateDMA(historicalData, 124);
            const srtv = calculateSRTV(quote.price, dma124);
            const avgVolume = historicalData.length > 20
              ? historicalData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20
              : quote.volume;
            const volumeRatio = avgVolume > 0 ? quote.volume / avgVolume : 1;

            const signalsToAdd: Array<{ strategy: string; signal: string; target?: number; details: string }> = [];

            if (rsi < 35) {
              signalsToAdd.push({
                strategy: "rsi-nifty-shop",
                signal: "BUY",
                target: quote.price * 1.1,
                details: `RSI at ${rsi.toFixed(1)} — oversold zone`,
              });
            } else if (rsi > 70) {
              signalsToAdd.push({
                strategy: "rsi-nifty-shop",
                signal: "SELL",
                details: `RSI at ${rsi.toFixed(1)} — overbought zone`,
              });
            }

            if (srtv < 0.92) {
              signalsToAdd.push({
                strategy: "gap-up",
                signal: "BUY",
                target: dma124,
                details: `SRTV ${srtv.toFixed(3)} — well below 124 DMA`,
              });
            }

            if (volumeRatio > 1.5 && quote.changePercent > 2) {
              signalsToAdd.push({
                strategy: "turtle",
                signal: "BUY",
                target: quote.price * 1.15,
                details: `Volume surge ${volumeRatio.toFixed(1)}x with ${quote.changePercent.toFixed(1)}% gain`,
              });
            }

            if (rsi > 40 && rsi < 60 && srtv > 0.98 && srtv < 1.02) {
              signalsToAdd.push({
                strategy: "rsi-nifty-shop",
                signal: "WATCH",
                details: `Neutral zone — RSI ${rsi.toFixed(1)}, SRTV ${srtv.toFixed(3)}`,
              });
            }

            for (const sig of signalsToAdd) {
              await storage.addSignal({
                symbol,
                companyName: quote.name,
                strategy: sig.strategy,
                signal: sig.signal,
                price: quote.price,
                target: sig.target || null,
                details: sig.details,
              });
              count++;
            }
          } catch (error: any) {
            log(`Scan error for ${symbol}: ${error.message}`);
          }
        })
      );

      res.json({ success: true, count });
    } catch (error: any) {
      log(`Scan error: ${error.message}`);
      res.status(500).json({ message: "Scan failed" });
    }
  });

  app.post("/api/scan/reit", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("reit-invit");

      let count = 0;
      const symbolsToScan = REIT_INVIT_SYMBOLS.map(i => i.symbol);
      const BATCH_SIZE = 5;

      for (let i = 0; i < symbolsToScan.length; i += BATCH_SIZE) {
        const batch = symbolsToScan.slice(i, i + BATCH_SIZE);
        const batchQuotes = await getBulkQuotes(batch);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            const universeItem = REIT_INVIT_SYMBOLS.find(item => item.symbol === symbol);
            const name = universeItem?.name || symbol;
            const bseCode = universeItem?.bseCode || "";
            const type = universeItem?.type || "INVIT";
            try {
              const quote = batchQuotes[symbol] || await getStockQuote(symbol);
              const historicalData = await getHistoricalData(symbol, 13);

              if (!quote || historicalData.length < 30) {
                const indexInclusion = getIndexInclusion(symbol);
                const capitalPerTrade = DEFAULT_CAPITAL_PER_STOCK / CAPITAL_PARTS;
                await storage.addSignal({
                  symbol,
                  companyName: name,
                  strategy: "reit-invit",
                  signal: "RED",
                  price: quote?.price || 0,
                  target: null,
                  details: JSON.stringify({
                    bseCode,
                    indexInclusion,
                    cmp: quote?.price || 0,
                    high52: 0,
                    highDate: "",
                    low52: 0,
                    lowDate: "",
                    output: "Stock in red zone",
                    zone: "RED",
                    zoneLogic: "DATE_COMPARISON",
                    last5High: 0,
                    last5Low: 0,
                    buyAbove: 0,
                    suggestedBuyPrice: null,
                    lastBuyPrice: null,
                    avoidUpper: null,
                    avoidLower: null,
                    target: null,
                    stop: null,
                    capitalPerTrade: +capitalPerTrade.toFixed(2),
                    capitalParts: CAPITAL_PARTS,
                    totalCapitalPerStock: DEFAULT_CAPITAL_PER_STOCK,
                    riskWarning: "Insufficient data",
                  }),
                });
                count++;
                return;
              }

              const stats = get52WeekStats(historicalData);
              const cmp = quote.price || historicalData[historicalData.length - 1]?.close || 0;
              const indexInclusion = getIndexInclusion(symbol);
              const last5 = historicalData.slice(-5);
              const last5High = last5.length ? Math.max(...last5.map((d) => d.high)) : 0;
              const last5Low = last5.length ? Math.min(...last5.map((d) => d.low)) : 0;
              const buyAbove = last5High;
              const isGreenZone = stats.zone === "GREEN";
              const breakout = isGreenZone && buyAbove > 0 && cmp > buyAbove;
              const lastBuy = await storage.getLastBuySignal(symbol, "reit-invit-orders");
              const lastBuyPrice = lastBuy?.price ? Number(lastBuy.price) : null;
              const lastBuyAt = lastBuy?.createdAt ? new Date(lastBuy.createdAt).getTime() : 0;
              const weeklyLimit = lastBuyAt ? Date.now() - lastBuyAt < WEEK_MS : false;
              const avoidUpper = lastBuyPrice ? lastBuyPrice * 1.0275 : null;
              const avoidLower = lastBuyPrice ? lastBuyPrice * 0.9725 : null;
              const suggestedBuyPrice = breakout ? buyAbove : null;
              const avoidTriggered = suggestedBuyPrice !== null && avoidLower !== null && avoidUpper !== null
                ? suggestedBuyPrice >= avoidLower && suggestedBuyPrice <= avoidUpper
                : false;
              const targetBase = lastBuyPrice ?? suggestedBuyPrice;
              const target = targetBase ? targetBase * 1.06 : null;
              const stop = last5Low || null;
              const capitalPerTrade = DEFAULT_CAPITAL_PER_STOCK / CAPITAL_PARTS;
              const hasPosition = lastBuyPrice !== null;
              const action = stats.zone === "RED"
                ? "RED_ZONE"
                : hasPosition
                  ? target && cmp >= target
                    ? "SELL"
                    : stop !== null && cmp <= stop
                      ? "EXIT"
                      : "HOLD"
                  : breakout
                    ? weeklyLimit
                      ? "SKIP_WEEKLY_LIMIT"
                      : avoidTriggered
                        ? "AVOID_2_75"
                        : "BUY"
                    : "WATCH";
              const riskWarning = stats.zone === "RED"
                ? "RED_ZONE: avoid fresh trades"
                : hasPosition && stop !== null && cmp <= stop
                  ? "Below Darvas support"
                  : hasPosition && target !== null && cmp >= target
                    ? "Target hit"
                    : weeklyLimit
                      ? "Weekly limit: last buy within 7 days"
                      : avoidTriggered
                        ? "Avoid band ±2.75% around last buy"
                        : breakout
                          ? "Breakout valid"
                          : "No breakout above last 5-day high";

              await storage.addSignal({
                symbol,
                companyName: name,
                strategy: "reit-invit",
                signal: stats.zone,
                price: cmp,
                target: target ? +target.toFixed(2) : null,
                details: JSON.stringify({
                  bseCode,
                  indexInclusion,
                  cmp: +cmp.toFixed(2),
                  high52: +stats.high52.toFixed(2),
                  highDate: stats.highDate,
                  low52: +stats.low52.toFixed(2),
                  lowDate: stats.lowDate,
                  output: stats.output,
                  zone: stats.zone,
                  zoneLogic: "DATE_COMPARISON",
                  last5High: +last5High.toFixed(2),
                  last5Low: +last5Low.toFixed(2),
                  buyAbove: +buyAbove.toFixed(2),
                  suggestedBuyPrice: suggestedBuyPrice ? +suggestedBuyPrice.toFixed(2) : null,
                  lastBuyPrice: lastBuyPrice ? +lastBuyPrice.toFixed(2) : null,
                  avoidUpper: avoidUpper ? +avoidUpper.toFixed(2) : null,
                  avoidLower: avoidLower ? +avoidLower.toFixed(2) : null,
                  target: target ? +target.toFixed(2) : null,
                  stop: stop !== null ? +stop.toFixed(2) : null,
                  capitalPerTrade: +capitalPerTrade.toFixed(2),
                  capitalParts: CAPITAL_PARTS,
                  totalCapitalPerStock: DEFAULT_CAPITAL_PER_STOCK,
                  action,
                  riskWarning,
                }),
              });
              count++;
            } catch (error: any) {
              log(`REIT scan error for ${symbol}: ${error.message}`);
              const capitalPerTrade = DEFAULT_CAPITAL_PER_STOCK / CAPITAL_PARTS;
              await storage.addSignal({
                symbol,
                companyName: name,
                strategy: "reit-invit",
                signal: "RED",
                price: 0,
                target: null,
                details: JSON.stringify({
                  bseCode,
                  cmp: 0,
                  high52: 0,
                  highDate: "",
                  low52: 0,
                  lowDate: "",
                  output: "Stock in red zone",
                  zone: "RED",
                  last5High: 0,
                  suggestedBuyPrice: null,
                  avoidUpper: null,
                  avoidLower: null,
                  target: null,
                  capitalPerTrade: +capitalPerTrade.toFixed(2),
                  capitalParts: CAPITAL_PARTS,
                  totalCapitalPerStock: DEFAULT_CAPITAL_PER_STOCK,
                  riskWarning: "Data error",
                }),
              });
              count++;
            }
          })
        );

      }

      res.json({ success: true, count, message: `Scanned ${count} REIT/INVIT instruments` });
    } catch (error: any) {
      log(`REIT scan error: ${error.message}`);
      res.status(500).json({ message: "REIT/INVIT scan failed" });
    }
  });

  const performBohScan = async (symbols: string[], strategyName: string, batchSize = 5) => {
    log(`Starting BOH scan for ${symbols.length} symbols with strategy: ${strategyName}`);
    let bohCount = 0;
    // Ensure uniqueness
    const uniqueSymbols = Array.from(new Set(symbols));

    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize);
      log(`Processing batch ${i / batchSize + 1}: ${batch.join(", ")}`);
      const batchQuotes = await getBulkQuotes(batch);
      await Promise.allSettled(
        batch.map(async (symbol) => {
          try {
            const quote = batchQuotes[symbol] || await getStockQuote(symbol);
            // Fetch enough data for 52-week stats (approx 252 trading days, fetching 365 days)
            const historicalData = await getHistoricalData(symbol, 365); 

            // Basic validation
            if (!quote || historicalData.length < 30) {
              const indexInclusion = getIndexInclusion(symbol);
              const capitalPerTrade = DEFAULT_CAPITAL_PER_STOCK / CAPITAL_PARTS;
              // Log error signal
              await storage.addSignal({
                symbol,
                companyName: quote?.name || symbol.replace(".NS", ""),
                strategy: strategyName, // Use strategyName directly
                signal: "RED",
                price: quote?.price || 0,
                target: null,
                details: JSON.stringify({
                  indexInclusion: strategyName === "boh-etf" ? "ETF" : indexInclusion,
                  cmp: quote?.price || 0,
                  high52: 0,
                  highDate: "",
                  low52: 0,
                  lowDate: "",
                  output: "Insufficient data",
                  zone: "RED",
                  zoneLogic: "DATE_COMPARISON",
                  last5High: 0,
                  suggestedBuyPrice: null,
                  avoidUpper: null,
                  avoidLower: null,
                  target: null,
                  capitalPerTrade: +capitalPerTrade.toFixed(2),
                  capitalParts: CAPITAL_PARTS,
                  totalCapitalPerStock: DEFAULT_CAPITAL_PER_STOCK,
                  riskWarning: "Insufficient data",
                  action: "RED_ZONE",
                }),
              });
              bohCount++;
              return;
            }

            const close = quote.price;
            const stats = get52WeekStats(historicalData);
            const indexInclusion = strategyName === "boh-etf" ? "ETF" : getIndexInclusion(symbol);
            
            // Logic for breakout/signals
            const last5 = historicalData.slice(-5);
            const last5High = last5.length ? Math.max(...last5.map(d => d.high)) : 0;
            const last5Low = last5.length ? Math.min(...last5.map(d => d.low)) : 0;
            const buyAbove = last5High;
            const isGreenZone = stats.zone === "GREEN";
            
            // Breakout Logic
            // Breakout if in Green Zone and close > last 5 days high
            const breakout = isGreenZone && buyAbove > 0 && close > buyAbove;
            
            // Existing Position Check
            const lastBuy = await storage.getLastBuySignal(symbol, "boh-orders");
            const lastBuyPrice = lastBuy?.price ? Number(lastBuy.price) : null;
            const lastBuyAt = lastBuy?.createdAt ? new Date(lastBuy.createdAt).getTime() : 0;
            const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
            const weeklyLimit = lastBuyAt ? Date.now() - lastBuyAt < WEEK_MS : false;
            
            const avoidUpper = lastBuyPrice ? lastBuyPrice * 1.0275 : null;
            const avoidLower = lastBuyPrice ? lastBuyPrice * 0.9725 : null;
            const suggestedBuyPrice = breakout ? buyAbove : null;
            
            // Avoid range logic
            const avoidTriggered = suggestedBuyPrice !== null && avoidLower !== null && avoidUpper !== null
              ? suggestedBuyPrice >= avoidLower && suggestedBuyPrice <= avoidUpper
              : false;
              
            const targetBase = lastBuyPrice ?? suggestedBuyPrice;
            const target = targetBase ? targetBase * 1.06 : null;
            const stop = last5Low || null;
            
            const capitalPerTrade = DEFAULT_CAPITAL_PER_STOCK / CAPITAL_PARTS;
            const hasPosition = lastBuyPrice !== null;
            
            // Determine Action
            let action = "WATCH";
            let riskWarning = "";

            if (stats.zone === "RED") {
              action = "RED_ZONE";
              riskWarning = "RED_ZONE: avoid fresh trades";
            } else if (hasPosition) {
              if (target && close >= target) {
                action = "SELL";
                riskWarning = "Target hit";
              } else if (stop !== null && close <= stop) {
                action = "EXIT";
                riskWarning = "Below Darvas support";
              } else {
                action = "HOLD";
              }
            } else {
              if (breakout) {
                 if (weeklyLimit) {
                   action = "SKIP_WEEKLY_LIMIT";
                   riskWarning = "Weekly limit: last buy within 7 days";
                 } else if (avoidTriggered) {
                   action = "AVOID_2_75";
                   riskWarning = "Avoid band ±2.75% around last buy";
                 } else {
                   action = "BUY";
                   riskWarning = "Breakout valid";
                 }
              } else {
                action = "WATCH";
                riskWarning = "No breakout above last 5-day high";
              }
            }

            log(`Adding signal for ${symbol}: ${stats.zone} [${strategyName}]`);
              await storage.addSignal({
                symbol,
                companyName: quote.name,
                strategy: strategyName,
                signal: stats.zone,
              price: close,
              target: target ? +target.toFixed(2) : null,
              details: JSON.stringify({
                indexInclusion,
                cmp: +close.toFixed(2),
                high52: +stats.high52.toFixed(2),
                highDate: stats.highDate,
                low52: +stats.low52.toFixed(2),
                lowDate: stats.lowDate,
                output: stats.output,
                zone: stats.zone,
                zoneLogic: "DATE_COMPARISON",
                last5High: +last5High.toFixed(2),
                last5Low: +last5Low.toFixed(2),
                buyAbove: +buyAbove.toFixed(2),
                suggestedBuyPrice: suggestedBuyPrice ? +suggestedBuyPrice.toFixed(2) : null,
                lastBuyPrice: lastBuyPrice ? +lastBuyPrice.toFixed(2) : null,
                avoidUpper: avoidUpper ? +avoidUpper.toFixed(2) : null,
                avoidLower: avoidLower ? +avoidLower.toFixed(2) : null,
                target: target ? +target.toFixed(2) : null,
                stop: stop !== null ? +stop.toFixed(2) : null,
                capitalPerTrade: +capitalPerTrade.toFixed(2),
                capitalParts: CAPITAL_PARTS,
                totalCapitalPerStock: DEFAULT_CAPITAL_PER_STOCK,
                action,
                riskWarning,
              }),
            });
            bohCount++;
          } catch (error: any) {
            log(`BOH scan error for ${symbol}: ${error.message}`);
            // Log error entry
             const capitalPerTrade = DEFAULT_CAPITAL_PER_STOCK / CAPITAL_PARTS;
             await storage.addSignal({
                symbol,
                companyName: symbol.replace(".NS", ""),
                strategy: strategyName === "boh-etf" ? "boh-etf" : "boh-filter",
                signal: "RED",
                price: 0,
                target: null,
                details: JSON.stringify({
                  indexInclusion: strategyName === "boh-etf" ? "ETF" : "Unknown",
                  cmp: 0,
                  high52: 0,
                  highDate: "",
                  low52: 0,
                  lowDate: "",
                  output: "Stock scan error",
                  zone: "RED",
                  zoneLogic: "DATE_COMPARISON",
                  last5High: 0,
                  suggestedBuyPrice: null,
                  avoidUpper: null,
                  avoidLower: null,
                  target: null,
                  capitalPerTrade: +capitalPerTrade.toFixed(2),
                  capitalParts: CAPITAL_PARTS,
                  totalCapitalPerStock: DEFAULT_CAPITAL_PER_STOCK,
                  riskWarning: "Data error",
                  action: "RED_ZONE",
                }),
              });
              bohCount++;
          }
        })
      );
    }
    return bohCount;
  };

  app.post("/api/scan/boh-darvas", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("boh-filter");
      // Use slice(0, 250) to strictly limit to 250
      const symbolsToScan = Array.from(new Set(NIFTY_LARGEMIDCAP_250_SYMBOLS)).slice(0, 250);
      const bohCount = await performBohScan(symbolsToScan, "boh-filter");
      res.json({
        success: true,
        bohCount,
        message: `BOH: ${bohCount} zones`,
      });
    } catch (error: any) {
      log(`BOH scan error: ${error.message}`);
      res.status(500).json({ message: "BOH scan failed" });
    }
  });
  
  app.post("/api/scan/boh-etf", async (_req, res) => {
    try {
      // We append to existing signals or clear?
      // User likely wants to see ETFs *alongside* or *instead*?
      // "add ETF button" -> implies separate action.
      // If we clear "boh-filter", we lose the stock scan.
      // If we don't clear, we append.
      // Let's clear for now if the user treats them as separate views, 
      // BUT the UI reads "boh-filter" strategy. 
      // If I clear, the previous stock scan is gone.
      // If I want to keep both, I should probably NOT clear if the intent is to see them together.
      // However, usually these buttons are "Run Scan X" which refreshes the view.
      // I will clear "boh-filter" signals to show only ETFs when this button is clicked, 
      // consistent with how "Scan Nifty Large Midcap" works (it clears everything).
      await storage.clearSignalsByStrategy("boh-etf");
      
      const symbolsToScan = NSE_ETF_UNIVERSE.map(e => e.symbol);
      const bohCount = await performBohScan(symbolsToScan, "boh-etf");
      
      res.json({
        success: true,
        bohCount,
        message: `BOH ETF: ${bohCount} zones`,
      });
    } catch (error: any) {
      log(`BOH ETF scan error: ${error.message}`);
      res.status(500).json({ message: "BOH ETF scan failed" });
    }
  });



  // ======================== CLASS 5 — SRTV ETF SCANNER ========================
  const NSE_ETF_UNIVERSE_DEPRECATED = [
    { symbol: "PSUBNKIETF.NS", underlying: "ICICI Prudential Nifty PSU Bank ETF" },
    { symbol: "PSUBNKBEES.NS", underlying: "Nifty PSU Bank" },
    { symbol: "PSUBANKADD.NS", underlying: "DSP Nifty PSU Bank ETF" },
    { symbol: "HDFCPSUBK.NS", underlying: "HDFC NIFTY PSU BANK ETF" },
    { symbol: "MAFANG.NS", underlying: "NYSE FANG+ Total Return Index" },
    { symbol: "MOREALTY.NS", underlying: "Motilal Oswal Nifty Realty ETF" },
    { symbol: "MONQ50.NS", underlying: "Nasdaq Q-50 Total Return Index" },
    { symbol: "MASPTOP50.NS", underlying: "S&P 500 Top 50 Total Return Index" },
    { symbol: "ABSLBANETF.NS", underlying: "Nifty Bank" },
    { symbol: "INFRABEES.NS", underlying: "Nifty Infra" },
    { symbol: "SBIETFPB.NS", underlying: "Nifty Private Bank Index" },
    { symbol: "PVTBANIETF.NS", underlying: "Nifty Private Bank Index" },
    { symbol: "PVTBANKADD.NS", underlying: "DSP Nifty Private Bank ETF" },
    { symbol: "INFRAIETF.NS", underlying: "ICICI Prudential Nifty Infrastructure ETF" },
    { symbol: "HDFCPVTBAN.NS", underlying: "HDFC NIFTY Private Bank ETF" },
    { symbol: "HDFCNIFBAN.NS", underlying: "Nifty Bank" },
    { symbol: "BANKBETF.NS", underlying: "Bajaj Finserv Nifty Bank ETF" },
    { symbol: "UTIBANKETF.NS", underlying: "Nifty Bank" },
    { symbol: "BANKIETF.NS", underlying: "Nifty Bank" },
    { symbol: "BANKETFADD.NS", underlying: "DSP Nifty Bank ETF" },
    { symbol: "BANKETF.NS", underlying: "Mirae Asset Nifty Bank ETF" },
    { symbol: "BANKBEES.NS", underlying: "Nifty Bank" },
    { symbol: "SETFNIFBK.NS", underlying: "Nifty Bank" },
    { symbol: "BANKNIFTY1.NS", underlying: "Nifty Bank" },
    { symbol: "ALPHAETF.NS", underlying: "Mirae Asset Nifty 200 Alpha 30 ETF" },
    { symbol: "SMALLCAP.NS", underlying: "Mirae Asset Nifty Smallcap 250 Momentum Quality 100 ETF" },
    { symbol: "MON100.NS", underlying: "Nasdaq100" },
    { symbol: "CPSEETF.NS", underlying: "CPSE ETF" },
    { symbol: "GOLDETFADD.NS", underlying: "DSP Gold ETF" },
    { symbol: "ICICIB22.NS", underlying: "S&P BSE BHARAT 22 index" },
    { symbol: "MOVALUE.NS", underlying: "Motilal Oswal S&P BSE Enhanced Value ETF" },
    { symbol: "SETFGOLD.NS", underlying: "Gold" },
    { symbol: "HDFCGOLD.NS", underlying: "Gold" },
    { symbol: "QGOLDHALF.NS", underlying: "Gold" },
    { symbol: "BSLGOLDETF.NS", underlying: "Gold" },
    { symbol: "GOLDIETF.NS", underlying: "Gold" },
    { symbol: "GOLDCASE.NS", underlying: "Zerodha Gold ETF" },
    { symbol: "GOLDETF.NS", underlying: "Mirae Asset Gold ETF" },
    { symbol: "GOLDSHARE.NS", underlying: "Gold" },
    { symbol: "GOLDBEES.NS", underlying: "Gold" },
    { symbol: "GOLD1.NS", underlying: "Gold" },
    { symbol: "TATAGOLD.NS", underlying: "Tata Gold Exchange Traded Fund" },
    { symbol: "AXISGOLD.NS", underlying: "Gold" },
    { symbol: "COMMOIETF.NS", underlying: "ICICI Prudential Nifty Commodities ETF" },
    { symbol: "MOM30IETF.NS", underlying: "ICICI Prudential Nifty 200 Momentum 30 ETF" },
    { symbol: "HDFCMOMENT.NS", underlying: "HDFC NIFTY200 Momentum 30 ETF" },
    { symbol: "MOMENTUM.NS", underlying: "Aditya Birla Sun Life Nifty 200 Momentum 30 ETF" },
    { symbol: "SILVERETF.NS", underlying: "UTI Silver Exchange Traded Fund (UTI Silver ETF)" },
    { symbol: "HDFCSENSEX.NS", underlying: "SENSEX" },
    { symbol: "AXISNIFTY.NS", underlying: "Nifty 50" },
    { symbol: "NIF100IETF.NS", underlying: "Nifty 100" },
    { symbol: "NIFTY50ADD.NS", underlying: "Nifty 50 Index" },
    { symbol: "HDFCBSE500.NS", underlying: "HDFC S&P BSE 500 ETF" },
    { symbol: "NIF100BEES.NS", underlying: "Nifty 100 TRI" },
    { symbol: "NIFTYETF.NS", underlying: "Nifty 50" },
    { symbol: "UTINIFTETF.NS", underlying: "Nifty 50" },
    { symbol: "NIFTY1.NS", underlying: "Nifty 50" },
    { symbol: "HDFCNIF100.NS", underlying: "HDFC NIFTY 100 ETF" },
    { symbol: "HDFCNIFTY.NS", underlying: "Nifty 50" },
    { symbol: "SETFNIF50.NS", underlying: "Nifty 50" },
    { symbol: "NIFTYBEES.NS", underlying: "Nifty 50" },
    { symbol: "BSLNIFTY.NS", underlying: "Nifty 50" },
    { symbol: "NIFTYIETF.NS", underlying: "Nifty 50" },
    { symbol: "BSE500IETF.NS", underlying: "S&P BSE 500 index" },
    { symbol: "AUTOBEES.NS", underlying: "Nifty Auto TRI" },
    { symbol: "NEXT50IETF.NS", underlying: "Nifty Next 50" },
    { symbol: "JUNIORBEES.NS", underlying: "Nifty Next 50" },
    { symbol: "ABSLNN50ET.NS", underlying: "Nifty Next 50" },
    { symbol: "AUTOIETF.NS", underlying: "Nifty Auto Index" },
    { symbol: "ESILVER.NS", underlying: "Edelweiss Silver ETF" },
    { symbol: "MID150BEES.NS", underlying: "Nifty Midcap 150 TRI" },
    { symbol: "TATSILV.NS", underlying: "Tata Silver Exchange Traded Fund" },
    { symbol: "UTINEXT50.NS", underlying: "Nifty Next 50" },
    { symbol: "MIDCAPETF.NS", underlying: "Mirae Asset Mutual Fund - Mirae Asset Nifty Midcap 150 ETF" },
    { symbol: "HDFCSILVER.NS", underlying: "HDFC Silver ETF" },
    { symbol: "MIDCAPIETF.NS", underlying: "Nifty Midcap 150" },
    { symbol: "AXISILVER.NS", underlying: "Axis Silver ETF" },
    { symbol: "SILVER1.NS", underlying: "Kotak Silver ETF" },
    { symbol: "SETFNN50.NS", underlying: "Nifty Next 50" },
    { symbol: "HDFCNEXT50.NS", underlying: "HDFC NIFTY NEXT 50 ETF" },
    { symbol: "SILVRETF.NS", underlying: "Mirae Asset Silver ETF" },
    { symbol: "SILVERBEES.NS", underlying: "Domestic price of Silver- based on LBMA Silver daily spot fixing price" },
    { symbol: "MOM100.NS", underlying: "Nifty Midcap 100" },
    { symbol: "SILVERIETF.NS", underlying: "Domestic Price of Silver" },
    { symbol: "HDFCMID150.NS", underlying: "HDFC NIFTY Midcap 150 ETF" },
    { symbol: "HDFCSML250.NS", underlying: "HDFC NIFTY Smallcap 250 ETF" },
    { symbol: "MOSMALL250.NS", underlying: "Motilal Oswal Nifty Smallcap 250 ETF" },
    { symbol: "MONIFTY500.NS", underlying: "Motilal Oswal Nifty 500 ETF" },
    { symbol: "ALPL30IETF.NS", underlying: "Nifty Alpha Low-Volatility 30 Index" },
    { symbol: "EQUAL50ADD.NS", underlying: "NIFTY 50 Equal Weight Index" },
    { symbol: "MIDSELIETF.NS", underlying: "S&P BSE Midcap Select Index" },
    { symbol: "DIVOPPBEES.NS", underlying: "Nifty Dividend Opportunities 50 TRI" },
    { symbol: "MNC.NS", underlying: "Kotak Nifty MNC ETF" },
    { symbol: "LICNMID100.NS", underlying: "LIC MF Nifty Midcap 100 ETF" },
    { symbol: "LOWVOLIETF.NS", underlying: "Nifty 100 Low Volatility 30 Index" },
    { symbol: "HDFCLOWVOL.NS", underlying: "HDFC NIFTY100 Low Volatility 30 ETF" },
    { symbol: "NV20BEES.NS", underlying: "Nifty50 Value20 TRI" },
    { symbol: "NV20IETF.NS", underlying: "Nifty50 Value 20" },
    { symbol: "FMCGIETF.NS", underlying: "Nifty FMCG Index" },
    { symbol: "HDFCVALUE.NS", underlying: "HDFC NIFTY50 Value 20 ETF" },
    { symbol: "FINIETF.NS", underlying: "ICICI Prudential Nifty Financial Services Ex-Bank ETF" },
    { symbol: "QUAL30IETF.NS", underlying: "ICICI Prudential Nifty 200 Quality 30 ETF" },
    { symbol: "LOWVOL1.NS", underlying: "Kotak Nifty 100 Low Vol 30 ETF" },
    { symbol: "NIFTYQLITY.NS", underlying: "Aditya Birla Sun Life Nifty 200 Quality 30 ETF" },
    { symbol: "CONSUMBEES.NS", underlying: "Nifty India Consumption TRI" },
    { symbol: "CONSUMIETF.NS", underlying: "Nifty India Consumption Index" },
    { symbol: "SBIETFCON.NS", underlying: "Nifty India Consumption Index" },
    { symbol: "TNIDETF.NS", underlying: "Nifty India Digital Index" },
    { symbol: "HEALTHIETF.NS", underlying: "Nifty Healthcare Index" },
    { symbol: "AXISHCETF.NS", underlying: "Nifty Healthcare Index" },
    { symbol: "PHARMABEES.NS", underlying: "Nifty Pharma TRI" },
    { symbol: "ITETFADD.NS", underlying: "DSP Nifty IT ETF" },
    { symbol: "ITIETF.NS", underlying: "Nifty IT Index" },
    { symbol: "ITBEES.NS", underlying: "Nifty IT TRI" },
    { symbol: "ITETF.NS", underlying: "Mirae Asset Nifty IT ETF" },
    { symbol: "MOHEALTH.NS", underlying: "Motilal Oswal S&P BSE Healthcare ETF" },
    { symbol: "SBIETFIT.NS", underlying: "Nifty IT Index" },
    { symbol: "HDFCNIFIT.NS", underlying: "HDFC NIFTY IT ETF" },
    { symbol: "HNGSNGBEES.NS", underlying: "Hang Seng Index" },
    { symbol: "MAHKTECH.NS", underlying: "Hang Seng TECH Total Return Index" },
    { symbol: "BFSI.NS", underlying: "Nifty Financial Services Index" },
    { symbol: "MOLOWVOL.NS", underlying: "Nifty Midcap 100 TRI" },
    { symbol: "ALPHA.NS", underlying: "NIFTY Alpha 50 Index" },
    { symbol: "MAKEINDIA.NS", underlying: "Nifty India Manufacturing Total Return Index" },
    { symbol: "NEXT50.NS", underlying: "Nifty Next 50" },
    { symbol: "SILVER.NS", underlying: "Physical price of Silver" },
    { symbol: "MIDCAP.NS", underlying: "Nifty Midcap 50 Index" },
    { symbol: "NV20.NS", underlying: "Nifty50 Value 20" },
    { symbol: "HEALTHY.NS", underlying: "Nifty Healthcare TRI" },
    { symbol: "TECH.NS", underlying: "Nifty IT TRI Index" },
    { symbol: "IT.NS", underlying: "NIFTY IT Index" },
    { symbol: "ESG.NS", underlying: "NIFTY100 ESG SECTOR LEADERS" },
    { symbol: "MOMOMENTUM.NS", underlying: "Nifty 200 Momentum 30 Total Return Index" },
    { symbol: "PSUBANK.NS", underlying: "Nifty PSU Bank" },
  ];

  app.post("/api/scan/srtv-etf", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("srtv-etf");

      const results: any[] = [];
      const batchSize = 5;

      for (let i = 0; i < NSE_ETF_UNIVERSE.length; i += batchSize) {
        const batch = NSE_ETF_UNIVERSE.slice(i, i + batchSize);
        const batchQuotes = await getBulkQuotes(batch.map(b => b.symbol));
        await Promise.allSettled(
          batch.map(async ({ symbol, underlying }) => {
            try {
              const quote = batchQuotes[symbol] || await getStockQuote(symbol);
              const historicalData = await getHistoricalData(symbol, 8);
              if (!quote || historicalData.length < 30) return;

              const dma124 = calculateDMA(historicalData, 124);
              const srtv = calculateSRTV(quote.price, dma124);
              const rsi = calculateRSI(historicalData);
              const avgVol20 = historicalData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
              const turnover = quote.price * avgVol20;

              // Volume/Liquidity Filter: Exclude ETFs with < 1 Cr turnover
              if (turnover < 10000000) return;

              let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
              let valuation = "Neutral";
              if (srtv < 0.96) { signal = "BUY"; valuation = "Undervalued"; }
              else if (srtv > 1.12) { signal = "SELL"; valuation = "Overvalued"; }

              results.push({
                symbol, name: underlying || quote.name, price: quote.price,
                dma124: +dma124.toFixed(2), srtv: +srtv.toFixed(4),
                rsi: +rsi.toFixed(1), signal, valuation, avgVolume: Math.round(avgVol20),
              });

              await storage.addSignal({
                symbol, companyName: underlying || quote.name, strategy: "srtv-etf",
                signal, price: quote.price, target: signal === "BUY" ? dma124 * 1.12 : null,
                details: `SRTV: ${srtv.toFixed(4)} | 124DMA: ₹${dma124.toFixed(2)} | RSI: ${rsi.toFixed(1)} | ${valuation}`,
              });
            } catch (e: any) { log(`SRTV scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      results.sort((a, b) => a.srtv - b.srtv);
      const sipCandidates = results.filter(r => r.srtv < 0.96);
      const profitBooking = results.filter(r => r.srtv > 1.12);
      const neutral = results.filter(r => r.srtv >= 0.96 && r.srtv <= 1.12);

      res.json({
        success: true, scan_date: new Date().toISOString(),
        total_etfs_scanned: results.length,
        undervalued_count: sipCandidates.length,
        overvalued_count: profitBooking.length,
        top_sip_candidates: sipCandidates,
        profit_booking_candidates: profitBooking,
        neutral_zone: neutral,
        all_results: results,
      });
    } catch (e: any) {
      log(`SRTV ETF scan error: ${e.message}`);
      res.status(500).json({ message: "SRTV ETF scan failed" });
    }
  });

  app.post("/api/analyze/car", async (req, res) => {
    try {
      const { symbol } = req.body;
      if (!symbol) {
        return res.status(400).json({ success: false, message: "Symbol is required" });
      }

      const cleanSymbol = symbol.toUpperCase().endsWith(".NS") || symbol.toUpperCase().endsWith(".BO") 
        ? symbol.toUpperCase() 
        : `${symbol.toUpperCase()}.NS`;

      const quote = await getStockQuote(cleanSymbol);
      if (!quote) {
        return res.status(404).json({ success: false, message: "Stock not found" });
      }

      // Fetch daily data first; if too short, fallback to weekly
      let historicalData = await getHistoricalData(cleanSymbol, 24, "1d");
      if (historicalData.length < 60) {
        const weeklyData = await getHistoricalData(cleanSymbol, 60, "1wk");
        if (weeklyData.length >= 40) {
          historicalData = weeklyData;
        }
      }
      if (historicalData.length < 20) {
        return res.json({ success: true, data: { symbol: cleanSymbol, name: quote.name, price: quote.price, high52Week: quote.price, highDate: new Date().toISOString(), drawdown: 0, target628: parseFloat((quote.price * 1.05).toFixed(2)), carSignal: "AVOID" } });
      }

      // Find 52-Week High in the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const lastYearData = historicalData.filter(d => d.date >= oneYearAgo);
      const baseForHigh = lastYearData.length ? lastYearData : historicalData;
      const highPoint = baseForHigh.reduce((max, d) => d.high > max.high ? d : max, baseForHigh[0]);
      
      const highIndex = historicalData.findIndex(d => d.date.getTime() === highPoint.date.getTime());
      
      // Calculate Average Returns from High Date
      const dataSinceHigh = historicalData.slice(highIndex);
      let risingCount = 0;
      let prevAvgReturn = -Infinity;
      
      // We need at least 10 points to confirm trend
      // Calculate rolling average return
      for (let i = 1; i < dataSinceHigh.length; i++) {
        const periodReturn = ((dataSinceHigh[i].close - highPoint.high) / highPoint.high) * 100;
        // Simple smoothing/average check
        if (periodReturn > prevAvgReturn) {
          risingCount++;
        } else {
          // Reset if momentum breaks significantly? 
          // Or just count total rising days? 
          // Strategy says "10 rising average return points"
          // Let's assume strict consecutive or high frequency
        }
        prevAvgReturn = periodReturn;
      }

      // CAR Signal Logic
      let carSignal = "AVOID";
      // Simplified Logic: If price is recovering from drawdown and shows momentum
      const drawdown = ((quote.price - highPoint.high) / highPoint.high) * 100;
      
      // Check if we have 10+ rising candles in recent period
      // Or if average return curve is sloping up
      const recentData = dataSinceHigh.slice(-20);
      const positiveDays = recentData.filter(d => d.close > d.open).length;

      if (positiveDays >= 10 && drawdown > -15) { // Recovering well
         carSignal = "STRONG_BUY";
      } else if (positiveDays >= 7 && drawdown > -25) {
         carSignal = "BUY";
      }

      const target628 = highPoint.high * 1.618; // Golden Ratio Target

      const result = {
        symbol: cleanSymbol,
        name: quote.name,
        price: quote.price,
        high52Week: highPoint.high,
        highDate: highPoint.date,
        drawdown: drawdown,
        target628: parseFloat(target628.toFixed(2)),
        carSignal: carSignal
      };

      res.json({ success: true, data: result });

    } catch (error: any) {
      log(`CAR Analysis error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/scan/monthly-candle", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("monthly-candle");
      const results: any[] = [];
      const batchSize = 10;

      for (let i = 0; i < NIFTY_50_SYMBOLS.length; i += batchSize) {
        const batch = NIFTY_50_SYMBOLS.slice(i, i + batchSize);
        const batchQuotes = await getBulkQuotes(batch);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              const quote = batchQuotes[symbol] || await getStockQuote(symbol);
              const historicalData = await getHistoricalData(symbol, 3);
              if (!quote || historicalData.length < 40) { // Reduced threshold for shorter fetch
                console.log(`Insufficient data for ${symbol}: ${historicalData.length} records`);
                return;
              }

              const monthlyCandles = aggregateMonthly(historicalData);
              if (monthlyCandles.length < 2) {
                console.log(`Insufficient monthly candles for ${symbol}: ${monthlyCandles.length}`);
                return;
              }

              const current = monthlyCandles[monthlyCandles.length - 1];
              const prev = monthlyCandles[monthlyCandles.length - 2];
              const dma50 = calculateDMA(historicalData, 50);
              const avgVol = historicalData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;

              // Calculate indicators
              const aboveDma50 = quote.price > dma50;
              const volConfirm = quote.volume > avgVol;

              const monthIndex = new Date().getMonth(); // 0-11
              const year = new Date().getFullYear();

              // Helper to find last Tuesday of a month
              const getLastTuesday = (y: number, m: number) => {
                const date = new Date(y, m + 1, 0); // Last day of month
                while (date.getDay() !== 2) { // 2 is Tuesday
                  date.setDate(date.getDate() - 1);
                }
                return date;
              };

              // Helper to format date as YYYY-MM-DD
              const formatYMD = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dd}`;
              };

              // Calculate current expiry (last Tuesday of current month)
              const expiryDate = getLastTuesday(year, monthIndex);

              // Calculate previous month's expiry (last Tuesday of previous month)
              const prevMonthExpiry = getLastTuesday(year, monthIndex - 1);

              const expiryStr = formatYMD(expiryDate);

              // Format month range as "27 Jan 2026 to 24 Feb 2026"
              const formatDateFriendly = (d: Date) => {
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              };

              const monthRange = `${formatDateFriendly(prevMonthExpiry)} to ${formatDateFriendly(expiryDate)}`;

              // Use new Expiry Analysis
              const expiryCandle = analyzeExpiryCandle(historicalData, prevMonthExpiry, expiryDate);

              // Fallback to basic monthly candles if expiry logic fails (e.g. not enough data in range)
              const currentCandle = expiryCandle || {
                open: current.open, high: current.high, low: current.low, close: current.close,
                type: current.type, strength: "Moderate", bodyPercent: 0
              };

              let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
              let status = "Avoid";
              let target = 0;
              let stopLoss = 0;
              let entryPrice = 0;
              let riskLevel = "Medium";

              // Determine signal based on Expiry Candle
              if (currentCandle.type === "Bullish") {
                signal = "BUY";
                status = "Trade";
                entryPrice = quote.price; // Entry at Expiry Tuesday Close (approximated by CMP)
                target = entryPrice * 1.03;
                stopLoss = currentCandle.low;

                // Risk Level based on stop loss distance
                const slPct = ((entryPrice - stopLoss) / entryPrice) * 100;
                if (slPct < 3) riskLevel = "Low";
                else if (slPct > 7) riskLevel = "High";
                else riskLevel = "Medium";
              } else {
                // Bearish or Doji
                signal = "WATCH";
                status = "Avoid";
              }

              // Reverse Exit logic (needs history, simplistic check here)
              if (prev.type === "Bullish" && currentCandle.type === "Bearish") {
                signal = "SELL";
                status = "Reverse Exit";
              }

              results.push({
                symbol, name: quote.name, price: quote.price,
                currentMonth: "", // Removed Month Name as requested
                candleType: currentCandle.type,
                open: Number(currentCandle.open) || 0,
                high: Number(currentCandle.high) || 0,
                low: Number(currentCandle.low) || 0,
                close: Number(currentCandle.close) || 0,
                prevCandleType: prev.type, target, stopLoss, status,
                expiryDate: expiryStr,
                monthRange,
                aboveDma50, volConfirm, signal,
                entryPrice: Number(entryPrice) || 0, riskLevel
              });

              await storage.addSignal({
                symbol, companyName: quote.name, strategy: "monthly-candle",
                signal, price: quote.price, target: target || null,
                details: JSON.stringify({
                  currentMonth: "", // Empty string to hide month name
                  monthRange,
                  candleType: currentCandle.type,
                  open: Number(currentCandle.open) || 0,
                  high: Number(currentCandle.high) || 0,
                  low: Number(currentCandle.low) || 0,
                  close: Number(currentCandle.close) || 0,
                  entryPrice: Number(entryPrice) || 0,
                  target: Number(target) || 0,
                  stopLoss: Number(stopLoss) || 0,
                  expiryDate: expiryStr,
                  riskLevel,
                  status,
                  aboveDma50,
                  strength: (currentCandle as any).strength // Add strength to details
                }),
              });
            } catch (e: any) { log(`Monthly scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      const bullish = results.filter(r => r.signal === "BUY");
      const bearish = results.filter(r => r.signal === "SELL");

      res.json({
        success: true, total_scanned: results.length,
        bullish_count: bullish.length, bearish_count: bearish.length,
        bullish_entries: bullish, bearish_exits: bearish,
        all_results: results,
      });
    } catch (e: any) {
      log(`Monthly candle scan error: ${e.message}`);
      res.status(500).json({ message: "Monthly candle scan failed" });
    }
  });

  // ======================== CLASS 7+9 — FUNDAMENTAL + BH FILTER ========================
  app.post("/api/scan/fundamental", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("fundamental");
      const results: any[] = [];

      const csvPath = path.join(process.cwd(), "server", "data", "fundamental_data.csv");

      if (!fs.existsSync(csvPath)) {
        return res.status(404).json({ message: "Fundamental data CSV not found. Please upload 'fundamental_data.csv' to server/data/." });
      }

      const fileContent = fs.readFileSync(csvPath, "utf-8");
      const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== "");

      // Skip title row if present (starts with "Mahesh Kaushik")
      let startIndex = 0;
      if (lines[0].startsWith("Mahesh Kaushik")) startIndex = 1;

      // Regex to split CSV line respecting quotes
      const splitCSV = (line: string) => {
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // The above regex is simple, might miss empty fields. 
        // Better: split by comma, ignoring commas inside quotes
        let parts = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') { inQuote = !inQuote; }
          else if (char === ',' && !inQuote) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        return parts.map(p => p.replace(/^"|"$/g, '')); // Remove surrounding quotes
      };

      // Parse headers using same logic
      const headers = splitCSV(lines[startIndex]);
      console.log("CSV Headers:", headers);

      // Helper to find index by fuzzy name
      const getIdx = (name: string) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        return idx;
      };

      const idxSymbol = getIdx("BSE Code");
      const idxName = getIdx("Company Name");
      const idxSector = getIdx("Sector");
      const idxFaceValue = getIdx("Face Value");
      const idxTotalEquity = getIdx("Total Equity Capital");
      const idxTotalShare = getIdx("Total Share Cr.");
      const idxBookValue = getIdx("Book Value");
      const idxSales = getIdx("Sales in Cr.");
      const idxNetSalePerShare = getIdx("Net Sale Par Share");
      const idxNetProfit = getIdx("Net Profit Cr.");
      const idxEPS = getIdx("EPS");
      const idxDividend = getIdx("Dividend Rupees");
      const idxDERatio = getIdx("D/E ratio");
      const idxROE = getIdx("RONW %");
      const idxPromoters = getIdx("Promoters %");
      const idxPledged = getIdx("Pledged %");
      const idxInstitutional = getIdx("Institutional %");
      const idxMarketCap = getIdx("Market Cap");
      const idxPrice = getIdx("Price");
      const idx52High = getIdx("52 Week High");
      const idx52Low = getIdx("52 Week Low");
      const idx52Ratio = getIdx("52 Week High/ Low Ratio");
      const idxEV = getIdx("Entprise Value");

      const candidates: any[] = [];

      for (let i = startIndex + 1; i < lines.length; i++) {
        const row = splitCSV(lines[i]);
        if (row.length < headers.length - 5) continue; // Skip malformed rows

        const parseNum = (val: string) => parseFloat((val || "0").replace(/,/g, "")) || 0;
        const parseStr = (val: string) => (val || "").trim();

        const bseCode = parseStr(row[idxSymbol]);
        const name = parseStr(row[idxName]);
        const sector = parseStr(row[idxSector]);
        const faceValue = parseNum(row[idxFaceValue]);
        const totalEquity = parseNum(row[idxTotalEquity]);
        const totalShareCr = parseNum(row[idxTotalShare]);
        const bookValue = parseNum(row[idxBookValue]);
        const salesCr = parseNum(row[idxSales]);
        const netSalePerShare = parseNum(row[idxNetSalePerShare]);
        const netProfit = parseNum(row[idxNetProfit]);
        const eps = parseNum(row[idxEPS]);
        const dividend = parseNum(row[idxDividend]);
        const deRatio = parseNum(row[idxDERatio]);
        const roe = parseNum(row[idxROE]);
        const promoters = parseNum(row[idxPromoters]);
        const pledged = parseNum(row[idxPledged]);
        const institutional = parseNum(row[idxInstitutional]);
        const marketCap = parseNum(row[idxMarketCap]);
        const price = parseNum(row[idxPrice]);
        const high52 = parseNum(row[idx52High]);
        const low52 = parseNum(row[idx52Low]);
        const ratio52 = parseNum(row[idx52Ratio]);
        const ev = parseNum(row[idxEV]);

        // Custom Ratios
        // Using CSV provided values where possible, or calculating if needed
        // The prompt asks for these columns, many are directly in CSV.
        const priceToSalesPS = netSalePerShare > 0 ? price / netSalePerShare : 999;
        const highLowRatioCalc = low52 > 0 ? high52 / low52 : 1;

        // --- FILTERS (Sequential) ---
        let passed = true;
        let failedFilters: string[] = [];
        let failedAtFilter = 0; // 0 = passed all

        // Filter 1: Book Value (<= 0 OR < 10)
        if (passed && (bookValue <= 0 || bookValue < 10)) {
          passed = false;
          failedFilters.push("BV<=10");
          failedAtFilter = 1;
        }

        // Filter 2: ROE (< 3%)
        if (passed && roe < 3) {
          passed = false;
          failedFilters.push("ROE<3%");
          failedAtFilter = 2;
        }

        // Filter 3: Promoter Pledge (> 0)
        if (passed && pledged > 0) {
          passed = false;
          failedFilters.push(`Pledge ${pledged}%`);
          failedAtFilter = 3;
        }

        // Filter 4: EPS <= 0 OR Net Profit <= 0
        if (passed && (eps <= 0 || netProfit <= 0)) {
          passed = false;
          failedFilters.push("Loss Making");
          failedAtFilter = 4;
        }

        // Filter 5: Enterprise Value (< 0)
        if (passed && ev < 0) {
          passed = false;
          failedFilters.push("Neg EV");
          failedAtFilter = 5;
        }

        // Filter 6: Price to SalesPerShare (> 2) - Strongest Filter
        if (passed && priceToSalesPS > 2) {
          passed = false;
          failedFilters.push(`P/SPS ${priceToSalesPS.toFixed(2)}`);
          failedAtFilter = 6;
        }

        if (i === startIndex + 1) {
          console.log("First Candidate Parsed:", {
            bseCode, name, sector, eps, dividend, marketCap, price, priceToSalesPS, passed, failedFilters,
            rowLength: row.length, headersLength: headers.length
          });
        }

        // Add to list with ALL requested columns
        candidates.push({
          symbol: `${bseCode}.BO`, // Use BSE symbol for Yahoo
          bseCode,
          name,
          sector,
          faceValue,
          totalEquity,
          totalShareCr,
          bookValue,
          salesCr,
          netSalePerShare,
          netProfit,
          eps,
          dividend,
          deRatio,
          roe,
          promoters,
          pledged,
          institutional,
          marketCap,
          price,
          fiftyTwoWeekHigh: high52,
          fiftyTwoWeekLow: low52,
          ratio52,
          ev,
          priceToSalesPS: +priceToSalesPS.toFixed(2), // Calculated
          passed,
          failedFilters,
          failedAtFilter, // To track where it failed
          bohStatus: "Pending"
        });
      }

      // Sort by Market Cap Descending
      candidates.sort((a, b) => b.marketCap - a.marketCap);

      // Process Top Candidates for BOH (Limit to top 30 passed to save time, or just return list if no fetch)
      // Prompt says: "Keep only companies satisfying BOH condition."
      // So we MUST check BOH for those that passed other filters.

      const passedCandidates = candidates.filter(c => c.passed);
      const failedCandidates = candidates.filter(c => !c.passed); // We can just return these as is

      // Calculate Stats
      const totalCandidates = candidates.length;
      // After F1: passed F1 (so failedAtFilter > 1 or 0)
      const afterF1 = candidates.filter(c => c.failedAtFilter === 0 || c.failedAtFilter > 1).length;
      const afterF2 = candidates.filter(c => c.failedAtFilter === 0 || c.failedAtFilter > 2).length;
      const afterF3 = candidates.filter(c => c.failedAtFilter === 0 || c.failedAtFilter > 3).length;
      const afterF4 = candidates.filter(c => c.failedAtFilter === 0 || c.failedAtFilter > 4).length;
      const afterF5 = candidates.filter(c => c.failedAtFilter === 0 || c.failedAtFilter > 5).length;
      const afterF6 = candidates.filter(c => c.failedAtFilter === 0).length;

      // BOH Check for top 30 passed candidates
      const bohCheckedCandidates = [];
      const batchSizeBOH = 10; // Reduced to 10 to prevent timeouts/rate limiting

      // Limit to top 60 to avoid timeout
      const toCheck = passedCandidates.slice(0, 60);
      const remainingPassed = passedCandidates.slice(60).map(c => ({ ...c, bohStatus: "Unchecked (Limit Reached)", passed: false, failedFilters: [...c.failedFilters, "BOH Check Skipped"], failedAtFilter: 7 }));

      console.log(`Starting BOH Check for ${toCheck.length} candidates...`);

      for (let i = 0; i < toCheck.length; i += batchSizeBOH) {
        const batch = toCheck.slice(i, i + batchSizeBOH);
        await Promise.allSettled(batch.map(async (c) => {
          try {
            // Fetch history for BOH dates
            // Optimized: Fetch 13 months
            const historicalData = await getHistoricalData(c.symbol, 13);
            if (!historicalData || historicalData.length < 200) {
              c.bohStatus = "Unknown (No Data)";
              return;
            }

            // Find 52W High/Low dates
            let maxP = -Infinity, minP = Infinity;
            let maxIdx = -1, minIdx = -1;

            // Analyze last 250 trading days
            const recent = historicalData.slice(-250);
            recent.forEach((d, idx) => {
              if (d.high > maxP) { maxP = d.high; maxIdx = idx; }
              if (d.low < minP) { minP = d.low; minIdx = idx; }
            });

            // BOH Condition: High Date (maxIdx) < Low Date (minIdx)
            // AND Current Price (last item) > Low Price (minP) (Implied if rising)
            // Meaning High happened BEFORE Low.
            const currentPrice = recent[recent.length - 1].close;
            const risingFromLow = currentPrice > minP;

            if (maxIdx < minIdx && risingFromLow) {
              c.bohStatus = "BOH Qualified";
              // Passed remains true
            } else {
              c.bohStatus = "Not BOH (Low before High or Not Rising)";
              c.passed = false;
              c.failedFilters.push("Not BOH");
              c.failedAtFilter = 7;
            }
          } catch (e) {
            c.bohStatus = "Error Fetching Data";
            // c.passed = false; // Relaxed: Don't fail on error
            // c.failedFilters.push("Data Error");
          }
        }));
        bohCheckedCandidates.push(...batch);
      }

      const afterBOH = bohCheckedCandidates.filter(c => c.passed).length;

      // Combine all results
      const finalResults = [...bohCheckedCandidates, ...remainingPassed, ...failedCandidates];

      // Save signals for Strong Candidates
      for (const c of finalResults) {
        if (c.passed) {
          await storage.addSignal({
            symbol: c.symbol,
            companyName: c.name,
            strategy: "fundamental",
            signal: "BUY",
            price: c.price,
            target: null,
            details: JSON.stringify({
              verdict: "Strong Candidate",
              bohStatus: c.bohStatus,
              roe: c.roe,
              bookValue: c.bookValue,
              priceToSalesPS: c.priceToSalesPS,
              checks: "All Passed"
            }),
          });
        }

        results.push(c);
      }

      res.json({
        success: true,
        total_scanned: results.length,
        strong_count: results.filter(r => r.passed).length,
        watchlist_count: results.filter(r => !r.passed).length,
        stats: {
          total: totalCandidates,
          afterF1, afterF2, afterF3, afterF4, afterF5, afterF6, afterBOH
        },
        all_results: results,
      });
    } catch (e: any) {
      log(`Fundamental scan error: ${e.message}`);
      res.status(500).json({ message: "Fundamental scan failed" });
    }
  });

  // ======================== CLASS 8b — RSI LADDER SCANNER ========================
  app.post("/api/scan/rsi-ladder", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("rsi-ladder");
      const results: any[] = [];
      const batchSize = 10;

      for (let i = 0; i < NIFTY_50_SYMBOLS.length; i += batchSize) {
        const batch = NIFTY_50_SYMBOLS.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              const [quote, historicalData] = await Promise.all([
                getStockQuote(symbol),
                getHistoricalData(symbol, 13),
              ]);
              if (!quote || historicalData.length < 30) return;

              const rsi = calculateRSI(historicalData);
              const dma200 = calculateDMA(historicalData, 200);
              const aboveDma200 = quote.price > dma200;

              const buyLevels = [
                { level: 1, threshold: 35, label: "RSI < 35" },
                { level: 2, threshold: 30, label: "RSI < 30" },
                { level: 3, threshold: 25, label: "RSI < 25" },
                { level: 4, threshold: 20, label: "RSI < 20" },
                { level: 5, threshold: 15, label: "RSI < 15" },
                { level: 6, threshold: 10, label: "RSI < 10" },
              ];
              const sellLevels = [
                { level: 1, threshold: 65, label: "RSI > 65" },
                { level: 2, threshold: 70, label: "RSI > 70" },
                { level: 3, threshold: 75, label: "RSI > 75" },
                { level: 4, threshold: 80, label: "RSI > 80" },
                { level: 5, threshold: 85, label: "RSI > 85" },
                { level: 6, threshold: 90, label: "RSI > 90" },
              ];

              const activeBuyLevel = buyLevels.filter(l => rsi < l.threshold).length;
              const activeSellLevel = sellLevels.filter(l => rsi > l.threshold).length;
              const nextBuy = buyLevels.find(l => rsi >= l.threshold)?.label || "None";
              const nextSell = sellLevels.find(l => rsi <= l.threshold)?.label || "None";

              let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
              let action = "Hold";
              if (rsi < 35) { signal = "BUY"; action = `Buy Lot ${activeBuyLevel}`; }
              else if (rsi > 65) { signal = "SELL"; action = `Sell Lot ${activeSellLevel}`; }

              results.push({
                symbol, name: quote.name, price: quote.price,
                rsi: +rsi.toFixed(1), aboveDma200, dma200: +dma200.toFixed(2),
                activeBuyLevel, activeSellLevel,
                nextBuyLevel: nextBuy, nextSellLevel: nextSell,
                action, signal,
              });

              await storage.addSignal({
                symbol, companyName: quote.name, strategy: "rsi-ladder",
                signal, price: quote.price, target: null,
                details: `RSI: ${rsi.toFixed(1)} | ${action} | Buy Lots Active: ${activeBuyLevel} | Sell Lots Active: ${activeSellLevel} | ${aboveDma200 ? "Above" : "Below"} 200DMA | Next Buy: ${nextBuy} | Next Sell: ${nextSell}`,
              });
            } catch (e: any) { log(`RSI ladder scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      results.sort((a, b) => a.rsi - b.rsi);
      res.json({
        success: true, total_scanned: results.length,
        buy_zone: results.filter(r => r.rsi < 35).length,
        sell_zone: results.filter(r => r.rsi > 65).length,
        neutral_zone: results.filter(r => r.rsi >= 35 && r.rsi <= 65).length,
        all_results: results,
      });
    } catch (e: any) {
      log(`RSI ladder scan error: ${e.message}`);
      res.status(500).json({ message: "RSI ladder scan failed" });
    }
  });

  // ======================== CLASS 8 — WEEKLY ETF CONTRARIAN ========================
  const WEEKLY_ETF_UNIVERSE = [
    { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF" },
    { symbol: "BANKBEES.NS", name: "Bank Nifty ETF" },
    { symbol: "JUNIORBEES.NS", name: "Nifty Next 50 ETF" },
    { symbol: "MIDCAPETF.NS", name: "Midcap ETF" },
    { symbol: "CPSEETF.NS", name: "CPSE ETF" },
    { symbol: "ITBEES.NS", name: "IT ETF" },
    { symbol: "PSUBANKBEES.NS", name: "PSU Bank ETF" },
    { symbol: "GOLDBEES.NS", name: "Gold ETF" },
  ];

  function aggregateWeekly(data: any[]) {
    const weeks: Record<string, any[]> = {};
    data.forEach(d => {
      const date = new Date(d.date);
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
      const key = `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(d);
    });
    return Object.entries(weeks).sort().map(([week, days]) => ({
      week,
      open: days[0].open,
      high: Math.max(...days.map(d => d.high)),
      low: Math.min(...days.map(d => d.low)),
      close: days[days.length - 1].close,
      volume: days.reduce((s, d) => s + d.volume, 0),
      type: days[days.length - 1].close < days[0].open ? "Bearish" : "Bullish",
    }));
  }

  app.post("/api/scan/weekly-etf", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("weekly-etf");
      const results: any[] = [];

      await Promise.allSettled(
        WEEKLY_ETF_UNIVERSE.map(async ({ symbol, name }) => {
          try {
            const [quote, historicalData] = await Promise.all([
              getStockQuote(symbol),
              getHistoricalData(symbol, 13),
            ]);
            if (!quote || historicalData.length < 20) return;

            const weeklyCandles = aggregateWeekly(historicalData);
            if (weeklyCandles.length < 2) return;

            const current = weeklyCandles[weeklyCandles.length - 1];
            const bearishWeeks = weeklyCandles.slice(-12).filter(w => w.type === "Bearish").length;
            const rsi = calculateRSI(historicalData);
            const dma20 = calculateDMA(historicalData, 20);

            let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
            let status = "Waiting";
            if (current.type === "Bearish") { signal = "BUY"; status = "Accumulate"; }
            else if (current.type === "Bullish") { status = "Bullish Week"; }

            const simAvgPrice = weeklyCandles.slice(-Math.min(bearishWeeks, 12)).reduce((s, w) => s + w.close, 0) / Math.max(bearishWeeks, 1);
            const target3pct = simAvgPrice * 1.03;
            if (quote.price >= target3pct && bearishWeeks > 0) {
              signal = "SELL";
              status = "Target 3% Hit";
            }

            results.push({
              symbol, name: quote.name || name, price: quote.price,
              currentWeek: current.week, weeklyCandle: current.type,
              bearishWeeksLast12: bearishWeeks, rsi: +rsi.toFixed(1),
              simAvgPrice: +simAvgPrice.toFixed(2), target3pct: +target3pct.toFixed(2),
              belowDma20: quote.price < dma20, status, signal,
            });

            await storage.addSignal({
              symbol, companyName: quote.name || name, strategy: "weekly-etf",
              signal, price: quote.price, target: target3pct || null,
              details: `${current.week} ${current.type} | Bearish wks: ${bearishWeeks}/12 | Avg: ₹${simAvgPrice.toFixed(2)} | 3% Target: ₹${target3pct.toFixed(2)} | RSI: ${rsi.toFixed(1)} | ${status}`,
            });
          } catch (e: any) { log(`Weekly ETF scan error ${symbol}: ${e.message}`); }
        })
      );

      res.json({
        success: true, total_scanned: results.length,
        accumulate: results.filter(r => r.signal === "BUY").length,
        target_hit: results.filter(r => r.signal === "SELL").length,
        all_results: results,
      });
    } catch (e: any) {
      log(`Weekly ETF scan error: ${e.message}`);
      res.status(500).json({ message: "Weekly ETF scan failed" });
    }
  });

  // ======================== CLASS 4 — COMPOUNDING PROJECTION ========================
  app.get("/api/compound/projection", (req, res) => {
    try {
      const startCapital = parseFloat(req.query.start as string) || 3000;
      const profitPct = parseFloat(req.query.profit as string) || 6;
      const brokeragePct = parseFloat(req.query.brokerage as string) || 0.8;
      const taxPct = parseFloat(req.query.tax as string) || 15;
      const dividendSplit = parseFloat(req.query.split as string) || 50;
      const totalCycles = parseInt(req.query.cycles as string) || 344;

      const projection: any[] = [];
      let capital = startCapital;
      let totalDividend = 0;
      let totalReinvested = 0;

      for (let cycle = 1; cycle <= totalCycles; cycle++) {
        const gross = capital * (profitPct / 100);
        const brokerage = capital * (brokeragePct / 100);
        const netBeforeTax = gross - brokerage;
        const tax = netBeforeTax * (taxPct / 100);
        const netAfterTax = netBeforeTax - tax;
        const dividend = netAfterTax * (dividendSplit / 100);
        const reinvest = netAfterTax * ((100 - dividendSplit) / 100);

        totalDividend += dividend;
        totalReinvested += reinvest;
        capital += reinvest;

        if (cycle <= 50 || cycle % 10 === 0 || cycle === totalCycles) {
          projection.push({
            cycle, tradeAmount: +capital.toFixed(2),
            grossProfit: +gross.toFixed(2), brokerage: +brokerage.toFixed(2),
            netBeforeTax: +netBeforeTax.toFixed(2), tax: +tax.toFixed(2),
            netAfterTax: +netAfterTax.toFixed(2), dividend: +dividend.toFixed(2),
            reinvest: +reinvest.toFixed(2), totalDividend: +totalDividend.toFixed(2),
          });
        }
      }

      res.json({
        startCapital, profitPct, brokeragePct, taxPct, dividendSplit,
        totalCycles, finalCapital: +capital.toFixed(2),
        totalDividendEarned: +totalDividend.toFixed(2),
        totalReinvested: +totalReinvested.toFixed(2),
        growthMultiple: +(capital / startCapital).toFixed(1),
        projection,
      });
    } catch (e: any) {
      log(`Compounding projection error: ${e.message}`);
      res.status(500).json({ message: "Projection calculation failed" });
    }
  });

  // ======================== CLASS 9 — NIFTY SHOP (RSI + AVERAGING + COMPOUNDING) ========================
  // ======================== CLASS 9 — RSI NIFTY SHOP (RSI + AVERAGING + EMERGENCY) ========================
  const NIFTY_SHOP_UNIVERSE = NIFTY_100_SYMBOLS;

  app.post("/api/scan/nifty-shop", async (req, res) => {
    try {
      await storage.clearSignalsByStrategy("nifty-shop");
      const totalCapital = parseFloat(req.body?.totalCapital) || 200000;
      const allowMultiple = req.body?.allowMultiple !== false;
      const initialTradeSize = totalCapital / 40;
      const results: any[] = [];

      // Get current portfolio for Nifty Shop
      const openPositions = await storage.getPortfolioPositions();
      const shopPositions = openPositions.filter(p => p.isActive && p.strategyUsed === "nifty-shop");

      const batchSize = 5;
      for (let i = 0; i < NIFTY_SHOP_UNIVERSE.length; i += batchSize) {
        const batch = NIFTY_SHOP_UNIVERSE.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              const [quote, history] = await Promise.all([
                getStockQuote(symbol),
                getHistoricalData(symbol, 200), // Wilder's smooth needs lookback
              ]);
              if (!quote || history.length < 30) return;

              const currentPrice = quote.price;
              const rsi = calculateRSI(history);
              const pos = shopPositions.find(p => p.symbol === symbol);

              // Cycle Reset Rule Check
              let cycleReset = true;
              if (!pos) {
                // Find RSI > 50 in last 50 days
                const recentRsiCheck = history.slice(-50).map((_d, idx, arr) => calculateRSI(history.slice(0, history.length - (arr.length - 1 - idx))));
                cycleReset = recentRsiCheck.some(r => r > 50);
              }

              let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
              let zone: "Normal" | "Oversold" | "Deep Oversold" | "Sell Zone" = "Normal";
              if (rsi < 20) zone = "Deep Oversold";
              else if (rsi < 35) zone = "Oversold";
              else if (rsi > 65) zone = "Sell Zone";

              const avgPrice = pos ? Number(pos.entryPrice) : 0;
              const currentProfitPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
              const lastBuyPrice = pos ? Number(pos.entryPrice) : 0; // entryPrice used as last buy in current schema
              const priceFallPct = lastBuyPrice > 0 ? ((lastBuyPrice - currentPrice) / lastBuyPrice) * 100 : 0;
              const averagingCount = pos ? (pos.quantity > 0 ? Math.floor(totalCapital / (initialTradeSize * (pos.quantity || 1))) : 0) : 0; // Mock logic as schema doesn't have averagingCount
              // We'll use quantity to derive averaging count if needed, but for scanner we just report based on rsi

              const rsiLevelsAll = [35, 30, 25, 20, 15, 10, 5];
              let canBuyNew = !pos && rsi <= 35 && cycleReset;
              let averageSignal = false;
              if (pos && pos.isActive) {
                const rsiLevels = [30, 25, 20, 15, 10, 5];
                const levelHit = rsiLevels.find(l => rsi <= l);
                // Schema/Rule: RSI < level AND Price Fall >= 3.14%
                if (levelHit && priceFallPct >= 3.14) {
                  averageSignal = true;
                }
              }

              // Sell Rule
              const sellSignal = pos && pos.isActive && currentProfitPct >= 6.28;

              // Emergency Rule
              const drawdown = avgPrice > 0 ? ((avgPrice - currentPrice) / avgPrice) * 100 : 0;
              const recoveryMode = drawdown > 20;

              const idx = NIFTY_50_SYMBOLS.includes(symbol) ? "NIFTY50" : (NIFTY_NEXT_50_SYMBOLS.includes(symbol) ? "NEXT50" : "OTHER");
              const lotsActive = rsiLevelsAll.filter(l => rsi <= l).length;
              const sharesToBuy = Math.max(1, Math.floor(initialTradeSize / currentPrice));
              const baseForTarget = avgPrice > 0 ? avgPrice : currentPrice;
              const nextSellPrice = +(baseForTarget * 1.0628).toFixed(2);
              const nextBuyLevel = rsiLevelsAll.find(l => rsi > l) || null;
              const recommendScore =
                (averageSignal ? 120 : (canBuyNew ? 100 : 0)) +
                Math.max(0, 35 - rsi) +
                Math.max(0, priceFallPct);
              results.push({
                symbol, name: quote.name, price: currentPrice, rsi: +rsi.toFixed(1),
                zone, signal: sellSignal ? "SELL" : (canBuyNew ? "BUY" : "WATCH"),
                averageSignal, avgPrice, currentProfitPct: +currentProfitPct.toFixed(2),
                averagingCount: pos ? 1 : 0, // Placeholder
                cycleStatus: cycleReset ? "Ready" : "Waiting Reset",
                recoveryMode,
                priceFallPct: +priceFallPct.toFixed(2),
                index: idx,
                lotsActive,
                sharesToBuy,
                nextSellPrice,
                nextBuyLevel,
                recommendScore
              });
            } catch (e: any) { log(`RSI Shop scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      if (!allowMultiple) {
        const potentialNewBuys = results.filter(r => r.signal === "BUY").sort((a, b) => a.rsi - b.rsi);
        const confirmedBuySymbol = potentialNewBuys.length > 0 ? potentialNewBuys[0].symbol : null;
        results.forEach(r => {
          if (r.signal === "BUY" && r.symbol !== confirmedBuySymbol) {
            r.signal = "WATCH";
          }
          if (r.averageSignal && confirmedBuySymbol) {
            r.averageSignal = false;
          }
        });
      }

      // Persist signals
      for (const r of results) {
        if (r.signal !== "WATCH" || r.averageSignal) {
          await storage.addSignal({
            symbol: r.symbol, companyName: r.name, strategy: "nifty-shop",
            signal: r.averageSignal ? "BUY" : r.signal, // Averaging is a BUY signal
            price: r.price, target: +(r.price * 1.0628).toFixed(2),
            details: `RSI: ${r.rsi} | ${r.zone} | ${r.averageSignal ? "AVERAGING" : "NEW ENTRY"} | Drawdown: ${r.currentProfitPct}% | Recovery: ${r.recoveryMode}`
          });
        }
      }

      res.json({
        success: true, total_scanned: results.length,
        buy_zone: results.filter(r => r.signal === "BUY" || r.averageSignal).length,
        sell_zone: results.filter(r => r.signal === "SELL").length,
        trade_size: +initialTradeSize.toFixed(0),
        all_results: results,
      });
    } catch (e: any) {
      log(`Nifty Shop scan error: ${e.message}`);
      res.status(500).json({ message: "Nifty Shop scan failed" });
    }
  });

  // ======================== CLASS 10 — LONG TERM VALUE INDEX (LTVI) ========================
  app.get("/api/ltvi/status", (_req, res) => {
    const pct = LTVI_PROGRESS.total > 0 ? +(100 * (LTVI_PROGRESS.processed / LTVI_PROGRESS.total)).toFixed(1) : 0;
    res.json({ ...LTVI_PROGRESS, percent: pct });
  });

  app.post("/api/scan/ltvi", async (req, res) => {
    try {
      if (["parsing", "fetching", "ranking"].includes(LTVI_PROGRESS.stage)) {
        const pct = LTVI_PROGRESS.total > 0 ? +(100 * (LTVI_PROGRESS.processed / LTVI_PROGRESS.total)).toFixed(1) : 0;
        return res.status(202).json({ message: "scan in progress", ...LTVI_PROGRESS, percent: pct });
      }
      await storage.clearSignalsByStrategy("ltvi");
      const universeSize = Math.max(1, Math.min(1000, parseInt(req.body?.universeSize) || 300));
      const sheetMode = !!req.body?.sheetMode; // Use CSV-provided price/marketcap/NSPS to match sheet exactly
      LTVI_PROGRESS = { total: 0, processed: 0, stage: "parsing", startedAt: new Date().toISOString() };

      const csvPath = path.join(process.cwd(), "server", "data", "fundamental_data.csv");
      if (!fs.existsSync(csvPath)) {
        LTVI_PROGRESS = { total: 0, processed: 0, stage: "error", message: "CSV not found" };
        return res.status(404).json({ message: "fundamental_data.csv not found in server/data" });
      }

      const fileContent = fs.readFileSync(csvPath, "utf-8");
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim() !== "");

      // Skip first line if it's a title
      let startIndex = 0;
      if (lines[0].toLowerCase().includes("mahesh kaushik")) startIndex = 1;

      const splitCSV = (line: string) => {
        const parts: string[] = [];
        let current = "";
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') inQuote = !inQuote;
          else if (ch === "," && !inQuote) {
            parts.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        parts.push(current.trim());
        return parts.map((p) => p.replace(/^"|"$/g, ""));
      };

      const headers = splitCSV(lines[startIndex]);
      const getIdx = (name: string) => headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

      const idxBse = getIdx("BSE Code");
      const idxName = getIdx("Company Name");
      const idxSector = getIdx("Sector");
      const idxBV = getIdx("Book Value");
      const idxEPS = getIdx("EPS");
      const idxSalesCr = getIdx("Sales in Cr");
      const idxSharesCr = getIdx("Total Share Cr");
      const idxRONW = getIdx("RONW");
      const idxPledge = getIdx("Pledged %");
      const idxCsvPrice = getIdx("Price");
      const idxCsvMktCap = getIdx("Market Cap");
      const idxCsvNsps = getIdx("Net Sale Par Share");

      const parseNum = (v: string) => parseFloat((v || "0").toString().replace(/,/g, "")) || 0;
      const parseStr = (v: string) => (v || "").trim();

      const rawCandidates: any[] = [];
      for (let i = startIndex + 1; i < lines.length; i++) {
        const row = splitCSV(lines[i]);
        if (row.length < headers.length - 5) continue;

        const bse = parseStr(row[idxBse]);
        const name = parseStr(row[idxName]);
        const sector = parseStr(row[idxSector]);
        const bookValue = parseNum(row[idxBV]);
        const eps = parseNum(row[idxEPS]);
        const salesCr = parseNum(row[idxSalesCr]);
        const sharesCr = parseNum(row[idxSharesCr]);
        const ronw = parseNum(row[idxRONW]); // in %
        const pledge = parseNum(row[idxPledge]);
        const csvPrice = idxCsvPrice >= 0 ? parseNum(row[idxCsvPrice]) : 0;
        const csvMktCapCr = idxCsvMktCap >= 0 ? parseNum(row[idxCsvMktCap]) : 0;
        const csvNsps = idxCsvNsps >= 0 ? parseNum(row[idxCsvNsps]) : 0;

        // Basic elimination filters
        if (bookValue <= 0) continue;
        if (salesCr <= 1) continue; // Sales ≤ 1 Crore
        if (eps <= 0) continue;
        if (ronw <= 0) continue;
        if (pledge > 0) continue;

        rawCandidates.push({ bse, name, sector, bookValue, eps, salesCr, sharesCr, ronw, csvPrice, csvMktCapCr, csvNsps });
      }

      const universe = rawCandidates.slice(0, universeSize);
      LTVI_PROGRESS = { ...LTVI_PROGRESS, total: universe.length, processed: 0, stage: "fetching" };

      // Fetch prices in batches (bulk quotes to reduce network calls)
      const BATCH = 50;
      const results: any[] = [];
      for (let i = 0; i < universe.length; i += BATCH) {
        const batch = universe.slice(i, i + BATCH);
        // Fetch bulk quotes for this batch if not in sheet mode
        const symbols = !sheetMode ? batch.map((c) => `${c.bse}.BO`) : [];
        const bulk = !sheetMode && symbols.length ? await getBulkQuotes(symbols) : {};
        for (const c of batch) {
          const symbol = `${c.bse}.BO`;
          const quote = bulk[symbol];
          try {
            // Source values depending on mode
            const price = sheetMode ? c.csvPrice : (quote?.price || 0);
            const marketCap = sheetMode ? (c.csvMktCapCr * 10000000) : (quote?.marketCap || 0); // CSV in Cr -> convert to ₹
            const nsps = sheetMode ? (c.csvNsps || (c.sharesCr > 0 ? c.salesCr / c.sharesCr : 0)) : (c.sharesCr > 0 ? c.salesCr / c.sharesCr : 0);
            if (!price || !nsps) {
              LTVI_PROGRESS.processed = Math.min(LTVI_PROGRESS.total, LTVI_PROGRESS.processed + 1);
              continue;
            }
            if (nsps <= 0) {
              LTVI_PROGRESS.processed = Math.min(LTVI_PROGRESS.total, LTVI_PROGRESS.processed + 1);
              continue;
            }
            const pb = price / c.bookValue;
            const pe = price / c.eps;
            const pNsps = price / nsps;
            const pRonw = price / c.ronw;
            const ltvi = pb + pe + pNsps + pRonw;
            results.push({
              symbol,
              name: c.name,
              sector: c.sector,
              price: +price.toFixed(2),
              marketCap,
              pb: +pb.toFixed(2),
              pe: +pe.toFixed(2),
              pNsps: +pNsps.toFixed(2),
              pRonw: +pRonw.toFixed(2),
              ltvi: +ltvi.toFixed(2),
              ronw: +c.ronw.toFixed(2),
              bookValue: +c.bookValue.toFixed(2),
            });
          } finally {
            LTVI_PROGRESS.processed = Math.min(LTVI_PROGRESS.total, LTVI_PROGRESS.processed + 1);
          }
        }
      }

      LTVI_PROGRESS.stage = "ranking";
      // Rank flow: LTVI asc → Top 500 → MarketCap desc → Top 50
      results.sort((a, b) => a.ltvi - b.ltvi);
      const top500 = results.slice(0, Math.min(500, results.length));
      top500.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      const final50 = top500.slice(0, Math.min(50, top500.length));
      final50.forEach((r, idx) => (r.rank = idx + 1));

      const top10 = final50.slice(0, 10);
      const sipCandidates = final50.slice(0, Math.min(20, final50.length));

      for (const r of final50) {
        const signal = r.rank <= 10 ? ("BUY" as const) : r.rank <= 30 ? ("WATCH" as const) : ("SELL" as const);
        await storage.addSignal({
          symbol: r.symbol,
          companyName: r.name,
          strategy: "ltvi",
          signal,
          price: r.price,
          target: null,
          details: `Rank #${r.rank} | LTVI: ${r.ltvi} | PB: ${r.pb} | PE: ${r.pe} | P/NSPS: ${r.pNsps} | P/RONW: ${r.pRonw} | MCap: ₹${(r.marketCap / 10000000).toFixed(0)}Cr`,
        });
      }

      LTVI_PROGRESS = { ...LTVI_PROGRESS, stage: "complete", finishedAt: new Date().toISOString() };
      res.json({
        success: true,
        total_scanned: results.length,
        top_10: top10,
        sip_candidates: sipCandidates.length,
        all_results: final50,
        universe_size: universe.length,
        top_500_count: top500.length,
      });
    } catch (e: any) {
      log(`LTVI scan error: ${e.message}`);
      LTVI_PROGRESS = { ...LTVI_PROGRESS, stage: "error", message: e?.message || "LTVI scan error" };
      res.status(500).json({ message: "LTVI scan failed" });
    }
  });

  // ======================== CLASS 11 — RELATIVE VALUATION MARKING SYSTEM ========================
  app.post("/api/scan/marking", async (req, res) => {
    try {
      await storage.clearSignalsByStrategy("marking");
      const universeSize = parseInt(req.body?.universeSize) || 15;
      const symbolsToScan =
        universeSize <= 15
          ? NIFTY_TOP_15_SYMBOLS
          : universeSize <= 30
            ? NIFTY_50_SYMBOLS.slice(0, 30)
            : NIFTY_50_SYMBOLS;
      const results: any[] = [];
      const batchSize = 5;

      for (let i = 0; i < symbolsToScan.length; i += batchSize) {
        const batch = symbolsToScan.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              const [quote, summary] = await Promise.all([
                getStockQuote(symbol),
                getQuoteSummary(symbol),
              ]);
              if (!quote || !summary) return;

              const ks = summary.defaultKeyStatistics || {};
              const fd = summary.financialData || {};
              const sd = summary.summaryDetail || {};

              const pe = sd.trailingPE || 0;
              const pb = ks.priceToBook || 0;
              const totalRevenue = fd.totalRevenue || 0;
              const sharesOutstanding = ks.sharesOutstanding || 1;
              const ps = sharesOutstanding > 0 && totalRevenue > 0
                ? quote.price / (totalRevenue / sharesOutstanding) : 0;
              const ev = ks.enterpriseValue || 0;
              const ebitda = fd.ebitda || 0;
              const evEbitda = ebitda > 0 ? ev / ebitda : 0;

              if (pe <= 0 || pb <= 0 || ps <= 0 || evEbitda <= 0) return;

              results.push({
                symbol, name: quote.name, price: quote.price,
                pe: +pe.toFixed(2), pb: +pb.toFixed(2),
                ps: +ps.toFixed(2), evEbitda: +evEbitda.toFixed(2),
                marketCap: quote.marketCap || 0,
              });
            } catch (e: any) { log(`Marking scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      const n = results.length;
      if (n === 0) {
        return res.json({ success: true, total_scanned: 0, all_results: [] });
      }

      const assignMarks = (arr: any[], key: string) => {
        const sorted = [...arr].sort((a, b) => (a[key] - b[key]) || String(a.symbol).localeCompare(String(b.symbol)));
        sorted.forEach((item, idx) => {
          item[key + "Rank"] = idx + 1;
          item[key + "Marks"] = n - idx;
        });
      };

      assignMarks(results, "pe");
      assignMarks(results, "pb");
      assignMarks(results, "ps");
      assignMarks(results, "evEbitda");

      results.forEach(r => {
        r.totalScore = (r.peMarks || 0) + (r.pbMarks || 0) + (r.psMarks || 0) + (r.evEbitdaMarks || 0);
        r.maxScore = n * 4;
        r.scorePercent = +((r.totalScore / r.maxScore) * 100).toFixed(1);
      });

      results.sort((a, b) => (b.totalScore - a.totalScore) || String(a.symbol).localeCompare(String(b.symbol)));
      results.forEach((r, idx) => { r.rank = idx + 1; });

      const bestBuy = results[0];
      const mostExpensive = results[results.length - 1];

      for (const r of results) {
        const signal = r.rank <= 5 ? "BUY" as const : r.rank <= 10 ? "WATCH" as const : "SELL" as const;
        await storage.addSignal({
          symbol: r.symbol, companyName: r.name, strategy: "marking",
          signal, price: r.price, target: null,
          details: `Rank #${r.rank} | Total: ${r.totalScore}/${r.maxScore} (${r.scorePercent}%) | PE: ${r.pe} (${r.peMarks}) | PB: ${r.pb} (${r.pbMarks}) | PS: ${r.ps} (${r.psMarks}) | EV/EBITDA: ${r.evEbitda} (${r.evEbitdaMarks})`,
        });
      }

      res.json({
        success: true, total_scanned: n,
        best_buy: bestBuy,
        most_expensive: mostExpensive,
        all_results: results,
      });
    } catch (e: any) {
      log(`Marking scan error: ${e.message}`);
      res.status(500).json({ message: "Marking system scan failed" });
    }
  });

  // ======================== CLASS 12 — MONEY TREE ETF COMPOUNDING ========================
  app.get("/api/money-tree/simulate", (req, res) => {
    try {
      const weeklyInvestment = parseFloat(req.query.weekly as string) || 5000;
      const totalWeeks = parseInt(req.query.weeks as string) || 52;
      const annualReturnPct = parseFloat(req.query.returnPct as string) || 12;
      const profitThresholdPct = parseFloat(req.query.threshold as string) || 20;

      const weeklyReturn = annualReturnPct / 52 / 100;
      const threshold = weeklyInvestment * (profitThresholdPct / 100);

      let totalUnits = 0;
      let totalPrincipal = 0;
      let totalWithdrawn = 0;
      let bookingCount = 0;
      const projection: any[] = [];

      let simulatedPrice = 100;

      for (let week = 1; week <= totalWeeks; week++) {
        const priceChange = (Math.random() - 0.45) * 4;
        simulatedPrice = Math.max(50, simulatedPrice * (1 + priceChange / 100));

        const unitsBought = weeklyInvestment / simulatedPrice;
        totalUnits += unitsBought;
        totalPrincipal += weeklyInvestment;

        const portfolioValue = totalUnits * simulatedPrice;
        const profit = portfolioValue - totalPrincipal;
        let weeklyBooking = 0;

        if (profit >= threshold) {
          const sellUnits = threshold / simulatedPrice;
          totalUnits -= sellUnits;
          totalWithdrawn += threshold;
          weeklyBooking = threshold;
          bookingCount++;
        }

        if (week <= 12 || week % 4 === 0 || week === totalWeeks) {
          projection.push({
            week,
            price: +simulatedPrice.toFixed(2),
            unitsBought: +unitsBought.toFixed(4),
            totalUnits: +totalUnits.toFixed(4),
            totalPrincipal: +totalPrincipal.toFixed(0),
            portfolioValue: +(totalUnits * simulatedPrice).toFixed(0),
            profit: +(totalUnits * simulatedPrice - totalPrincipal).toFixed(0),
            profitBooked: +weeklyBooking.toFixed(0),
            totalWithdrawn: +totalWithdrawn.toFixed(0),
          });
        }
      }

      const finalValue = totalUnits * simulatedPrice;

      res.json({
        weeklyInvestment, totalWeeks, annualReturnPct, profitThresholdPct,
        threshold: +threshold.toFixed(0),
        finalPortfolioValue: +finalValue.toFixed(0),
        totalPrincipalInvested: +totalPrincipal.toFixed(0),
        totalProfitWithdrawn: +totalWithdrawn.toFixed(0),
        profitBookingCount: bookingCount,
        netGain: +(finalValue + totalWithdrawn - totalPrincipal).toFixed(0),
        projection,
      });
    } catch (e: any) {
      log(`Money Tree simulation error: ${e.message}`);
      res.status(500).json({ message: "Money Tree simulation failed" });
    }
  });

  // ======================== CLASS 13 — UPDATED TURTLE TRADING (55-DAY BREAKOUT) ========================
  const TURTLE_ETF_UNIVERSE = [
    { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF" },
    { symbol: "JUNIORBEES.NS", name: "Nifty Next 50 ETF" },
    { symbol: "BANKBEES.NS", name: "Bank Nifty ETF" },
    { symbol: "CPSEETF.NS", name: "CPSE ETF" },
    { symbol: "ITBEES.NS", name: "IT ETF" },
    { symbol: "MIDCAPETF.NS", name: "Midcap ETF" },
    { symbol: "GOLDBEES.NS", name: "Gold ETF" },
    { symbol: "PSUBANKBEES.NS", name: "PSU Bank ETF" },
  ];

  app.post("/api/scan/turtle-55", async (req, res) => {
    try {
      await storage.clearSignalsByStrategy("turtle-55");
      const capitalPerStock = parseFloat(req.body?.capitalPerStock) || 20000;
      const parts = 15;
      const perOrder = capitalPerStock / parts;
      const includeEtfs = req.body?.includeEtfs !== false;

      const symbolsToScan = [
        ...NIFTY_100_SYMBOLS.slice(0, 50).map(s => ({ symbol: s, name: s.replace(".NS", ""), type: "Stock" })),
        ...(includeEtfs ? TURTLE_ETF_UNIVERSE.map(e => ({ ...e, type: "ETF" })) : []),
      ];

      const results: any[] = [];
      const batchSize = 10;

      for (let i = 0; i < symbolsToScan.length; i += batchSize) {
        const batch = symbolsToScan.slice(i, i + batchSize);
        const batchQuotes = await getBulkQuotes(batch.map(b => b.symbol));
        await Promise.allSettled(
          batch.map(async ({ symbol, name, type }) => {
            try {
              const quote = batchQuotes[symbol] || await getStockQuote(symbol);
              const historicalData = await getHistoricalData(symbol, 6);
              if (!quote || historicalData.length < 55) return;

              const last55 = historicalData.slice(-55);
              const high55 = Math.max(...last55.map(d => d.high));
              const close = quote.price;
              const isBreakout55 = close >= high55;

              const sharesPerOrder = Math.floor(perOrder / close);
              const maxShares = sharesPerOrder * parts;
              const targetPrice = +(close * 1.0628).toFixed(2);
              const profitIfFull = +((targetPrice - close) * maxShares).toFixed(0);

              const rsi = calculateRSI(historicalData);
              const dma50 = calculateDMA(historicalData, 50);
              const aboveDma50 = close > dma50;

              let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
              let action = "No breakout — waiting";
              if (isBreakout55) {
                signal = "BUY";
                action = `Breakout above 55-day high ₹${high55.toFixed(2)}`;
              }
              if (close >= high55 * 1.0628 && isBreakout55) {
                signal = "SELL";
                action = `Target 6.28% hit from 55-day high`;
              }

              results.push({
                symbol, name: quote.name || name, type, price: close,
                high55: +high55.toFixed(2), isBreakout55,
                sharesPerOrder, maxShares,
                targetPrice, profitIfFull,
                rsi: +rsi.toFixed(1), dma50: +dma50.toFixed(2), aboveDma50,
                action, signal,
              });

              await storage.addSignal({
                symbol, companyName: quote.name || name, strategy: "turtle-55",
                signal, price: close,
                target: isBreakout55 ? targetPrice : null,
                details: `${type} | 55D High: ₹${high55.toFixed(2)} | ${action} | Shares/Order: ${sharesPerOrder} | Max: ${maxShares} | Target: ₹${targetPrice} | RSI: ${rsi.toFixed(1)} | ${aboveDma50 ? "Above" : "Below"} 50DMA`,
              });
            } catch (e: any) { log(`Turtle-55 scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      const breakouts = results.filter(r => r.isBreakout55);
      results.sort((a, b) => {
        if (a.isBreakout55 && !b.isBreakout55) return -1;
        if (!a.isBreakout55 && b.isBreakout55) return 1;
        return (b.price / b.high55) - (a.price / a.high55);
      });

      res.json({
        success: true, total_scanned: results.length,
        breakout_count: breakouts.length,
        stocks_count: results.filter(r => r.type === "Stock").length,
        etf_count: results.filter(r => r.type === "ETF").length,
        capital_per_stock: capitalPerStock,
        per_order: +perOrder.toFixed(0),
        all_results: results,
      });
    } catch (e: any) {
      log(`Turtle-55 scan error: ${e.message}`);
      res.status(500).json({ message: "Turtle-55 scan failed" });
    }
  });

  // Backtest for Updated Turtle Trading (55-day breakout)
  app.post("/api/backtest/turtle-55", async (req, res) => {
    try {
      const symbolRaw = (req.body?.symbol || "NIFTYBEES.NS").toString().toUpperCase();
      const symbol = symbolRaw.endsWith(".NS") ? symbolRaw : `${symbolRaw}.NS`;
      const totalCapital = parseFloat(req.body?.totalCapital) || 20000;
      const parts = parseInt(req.body?.parts) || 15;
      const breakoutDays = parseInt(req.body?.breakoutDays) || 55;
      const profitPct = parseFloat(req.body?.profitPct) || 6.28;
      const startDateStr = req.body?.startDate as string | undefined;
      const endDateStr = req.body?.endDate as string | undefined;
      const perOrder = totalCapital / parts;

      const endDate = endDateStr ? new Date(endDateStr) : new Date();
      const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setFullYear(endDate.getFullYear() - 2));
      const monthsDiff = Math.max(3, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));

      const history = await getHistoricalData(symbol, monthsDiff, "1d");
      if (!history || history.length < breakoutDays + 1) {
        return res.status(400).json({ message: `Insufficient data for ${symbol}` });
      }

      // Slice by dates
      const series = history.filter(d => d.date >= startDate && d.date <= endDate).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (series.length < breakoutDays + 1) {
        return res.status(400).json({ message: `Not enough data in selected range for ${symbol}` });
      }

      let remainingCash = totalCapital;
      let units = 0;
      let deployed = 0;
      let entries = 0;
      let rotations = 0;
      let wins = 0;

      const equityCurve: { date: string; equity: number; cash: number }[] = [];
      const markers: { date: string; type: "BUY" | "SELL"; price: number; units: number }[] = [];
      const rotationsDetail: { buyDate: string; sellDate: string; avgPrice: number; exitPrice: number; pnl: number; returnPct: number }[] = [];

      const profitMult = 1 + profitPct / 100;
      let avgPrice = 0;

      for (let i = breakoutDays; i < series.length; i++) {
        const today = series[i];
        const prevWindow = series.slice(i - breakoutDays, i);
        const highN = Math.max(...prevWindow.map(d => d.close));
        const close = today.close;

        // Breakout buy condition
        const canBuy = close > highN && entries < parts && remainingCash >= perOrder;
        if (canBuy) {
          const buyUnits = perOrder / close;
          const cost = buyUnits * close;
          units += buyUnits;
          deployed += cost;
          remainingCash -= cost;
          entries += 1;
          avgPrice = deployed / units;
          markers.push({ date: today.date.toISOString().slice(0, 10), type: "BUY", price: close, units: buyUnits });
        }

        // Profit booking rule
        if (units > 0 && close >= avgPrice * profitMult) {
          const sellValue = units * close;
          const pnl = sellValue - deployed;
          remainingCash += sellValue;
          rotations += 1;
          wins += pnl > 0 ? 1 : 0;
          rotationsDetail.push({
            buyDate: markers.length ? markers[markers.length - 1].date : series[i - 1].date.toISOString().slice(0, 10),
            sellDate: today.date.toISOString().slice(0, 10),
            avgPrice: +avgPrice.toFixed(2),
            exitPrice: +close.toFixed(2),
            pnl: +pnl.toFixed(2),
            returnPct: +(((close - avgPrice) / avgPrice) * 100).toFixed(2),
          });
          markers.push({ date: today.date.toISOString().slice(0, 10), type: "SELL", price: close, units });
          // Reset
          units = 0;
          deployed = 0;
          entries = 0;
          avgPrice = 0;
        }

        const equity = remainingCash + units * close;
        equityCurve.push({ date: today.date.toISOString().slice(0, 10), equity: +equity.toFixed(2), cash: +remainingCash.toFixed(2) });
      }

      // Metrics
      const startEquity = totalCapital;
      const endEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : totalCapital;
      const totalProfit = +(endEquity - startEquity).toFixed(2);
      const years = Math.max(0.1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      const cagr = +((Math.pow(endEquity / startEquity, 1 / years) - 1) * 100).toFixed(2);
      const avgReturn = rotationsDetail.length ? +(rotationsDetail.reduce((s, r) => s + r.returnPct, 0) / rotationsDetail.length).toFixed(2) : 0;
      const winRate = rotations > 0 ? +((wins / rotations) * 100).toFixed(1) : 0;
      // Max drawdown from equity curve
      let peak = -Infinity, maxDD = 0;
      for (const p of equityCurve) {
        if (p.equity > peak) peak = p.equity;
        const dd = (peak - p.equity) / peak;
        if (dd > maxDD) maxDD = dd;
      }
      const maxDrawdown = +(maxDD * 100).toFixed(2);
      // Capital utilization: average deployed / total
      const avgUtil = equityCurve.length
        ? +(equityCurve.reduce((s, p) => s + (1 - p.cash / totalCapital), 0) / equityCurve.length * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        params: { symbol, totalCapital, parts, breakoutDays, profitPct, startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10) },
        metrics: {
          rotations, winRate, averageReturnPerRotation: avgReturn, totalProfit, cagr, maxDrawdown, capitalUtilizationPct: avgUtil,
        },
        equityCurve,
        markers,
        rotations: rotationsDetail,
      });
    } catch (e: any) {
      log(`Turtle-55 backtest error: ${e.message}`);
      res.status(500).json({ message: "Backtest failed" });
    }
  });

  // ======================== CLASS 14 — GAP UP OPEN STRATEGY ========================
  app.post("/api/scan/gap-up", async (_req, res) => {
    try {
      await storage.clearSignalsByStrategy("gap-up-open");
      const results: any[] = [];
      const batchSize = 10;

      for (let i = 0; i < NIFTY_100_SYMBOLS.length; i += batchSize) {
        const batch = NIFTY_100_SYMBOLS.slice(i, i + batchSize);
        const batchQuotes = await getBulkQuotes(batch);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              const quote = batchQuotes[symbol] || await getStockQuote(symbol);
              const historicalData = await getHistoricalData(symbol, 3);
              if (!quote) return;

              const previousClose = quote.previousClose || 0;
              const todayOpen = quote.open || 0;
              const currentPrice = quote.price;

              if (previousClose <= 0 || todayOpen <= 0) return;

              const gapPercent = +((todayOpen - previousClose) / previousClose * 100).toFixed(2);
              const isValidGap = gapPercent >= 3.14;
              const priceAboveOpen = currentPrice > todayOpen;
              const greenCandle = currentPrice > previousClose;

              const rsi = historicalData.length >= 14 ? calculateRSI(historicalData) : 50;
              const dma20 = historicalData.length >= 20 ? calculateDMA(historicalData, 20) : currentPrice;
              const avgVolume20 = historicalData.length >= 20
                ? historicalData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20
                : quote.volume;
              const volumeRatio = avgVolume20 > 0 ? +(quote.volume / avgVolume20).toFixed(1) : 1;

              const targetConservative = +(currentPrice * 1.0628).toFixed(2);
              const targetAggressive = +(currentPrice * 1.0314).toFixed(2);

              let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
              let action = "No valid gap";

              if (isValidGap && priceAboveOpen && greenCandle) {
                signal = "BUY";
                action = `Gap ${gapPercent}% confirmed — price above open`;
              } else if (isValidGap && !priceAboveOpen) {
                signal = "WATCH";
                action = `Gap ${gapPercent}% — awaiting 3PM confirmation`;
              } else if (gapPercent >= 1 && gapPercent < 3.14) {
                action = `Minor gap ${gapPercent}% — below 3.14% threshold`;
              } else if (gapPercent < 0) {
                action = `Gap down ${gapPercent}% — no trade`;
              }

              results.push({
                symbol, name: quote.name, price: currentPrice,
                previousClose, todayOpen, gapPercent,
                isValidGap, priceAboveOpen, greenCandle,
                rsi: +rsi.toFixed(1), volumeRatio,
                targetConservative, targetAggressive,
                action, signal,
              });

              if (isValidGap) {
                await storage.addSignal({
                  symbol, companyName: quote.name, strategy: "gap-up-open",
                  signal, price: currentPrice,
                  target: signal === "BUY" ? targetConservative : null,
                  details: `Gap: ${gapPercent}% | Prev Close: ₹${previousClose.toFixed(2)} | Open: ₹${todayOpen.toFixed(2)} | ${action} | Target 6.28%: ₹${targetConservative} | Target 3.14%: ₹${targetAggressive} | Vol: ${volumeRatio}x | RSI: ${rsi.toFixed(1)}`,
                });
              }
            } catch (e: any) { log(`Gap Up scan error ${symbol}: ${e.message}`); }
          })
        );
      }

      results.sort((a, b) => b.gapPercent - a.gapPercent);
      const validGaps = results.filter(r => r.isValidGap);
      const confirmedBuys = results.filter(r => r.signal === "BUY");

      res.json({
        success: true, total_scanned: results.length,
        valid_gaps: validGaps.length,
        confirmed_buys: confirmedBuys.length,
        awaiting_confirmation: results.filter(r => r.isValidGap && r.signal === "WATCH").length,
        all_results: results,
      });
    } catch (e: any) {
      log(`Gap Up scan error: ${e.message}`);
      res.status(500).json({ message: "Gap Up scan failed" });
    }
  });

  // ======================== UNIVERSAL SINGLE STOCK SCANNER ========================
  app.post("/api/scan/single-stock", async (req, res) => {
    try {
      const rawSymbol = (req.body?.symbol || "").trim().toUpperCase();
      if (!rawSymbol) return res.status(400).json({ message: "Symbol is required" });
      const symbol = rawSymbol.endsWith(".NS") ? rawSymbol : `${rawSymbol}.NS`;

      const [quote, historicalData] = await Promise.all([
        getStockQuote(symbol),
        getHistoricalData(symbol, 14),
      ]);
      if (!quote) return res.status(404).json({ message: `Could not fetch data for ${symbol}` });

      const price = quote.price;
      const previousClose = quote.previousClose || 0;
      const todayOpen = quote.open || 0;

      const rsi = historicalData.length >= 14 ? +calculateRSI(historicalData).toFixed(1) : null;
      const dma20 = historicalData.length >= 20 ? +calculateDMA(historicalData, 20).toFixed(2) : null;
      const dma50 = historicalData.length >= 50 ? +calculateDMA(historicalData, 50).toFixed(2) : null;
      const dma124 = historicalData.length >= 124 ? +calculateDMA(historicalData, 124).toFixed(2) : null;
      const dma200 = historicalData.length >= 200
        ? +calculateDMA(historicalData, 200).toFixed(2)
        : (historicalData.length >= 50 ? +calculateDMA(historicalData, Math.min(historicalData.length, 50)).toFixed(2) : null);

      const srtv = dma124 ? +calculateSRTV(price, parseFloat(String(dma124))).toFixed(2) : null;

      const last55 = historicalData.length >= 55 ? historicalData.slice(-55) : historicalData;
      const high55 = last55.length > 0 ? +Math.max(...last55.map(d => d.high)).toFixed(2) : null;

      const avgVol20 = historicalData.length >= 20
        ? Math.round(historicalData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20)
        : null;
      const volumeRatio = avgVol20 && avgVol20 > 0 ? +(quote.volume / avgVol20).toFixed(1) : null;

      const gapPercent = previousClose > 0 && todayOpen > 0
        ? +((todayOpen - previousClose) / previousClose * 100).toFixed(2) : 0;

      let biosZone = null;
      if (historicalData.length >= 50) {
        try { biosZone = calculateBIOSZone(historicalData); } catch (_e) { }
      }

      const yearData = historicalData.slice(-252);
      const yearHigh = yearData.length > 0 ? +Math.max(...yearData.map(d => d.high)).toFixed(2) : null;
      const yearLow = yearData.length > 0 ? +Math.min(...yearData.map(d => d.low)).toFixed(2) : null;

      const monthlyData = historicalData.slice(-22);
      const monthOpen = monthlyData.length > 0 ? monthlyData[0].open : null;
      const monthHigh = monthlyData.length > 0 ? +Math.max(...monthlyData.map(d => d.high)).toFixed(2) : null;
      const monthLow = monthlyData.length > 0 ? +Math.min(...monthlyData.map(d => d.low)).toFixed(2) : null;

      res.json({
        symbol, name: quote.name, price, previousClose, todayOpen,
        volume: quote.volume, avgVol20, volumeRatio,
        dma124, dma200, srtv,
        high55,
        gapPercent,
        aboveDma50: dma50 ? price > parseFloat(String(dma50)) : null,
        aboveDma124: dma124 ? price > parseFloat(String(dma124)) : null,
        aboveDma200: dma200 ? price > parseFloat(String(dma200)) : null,
        isBreakout55: high55 ? price >= parseFloat(String(high55)) : null,
        target628: +(price * 1.0628).toFixed(2),
        target314: +(price * 1.0314).toFixed(2),
        yearHigh, yearLow,
        monthOpen, monthHigh, monthLow,
        biosZone: biosZone ? biosZone.zone : null,
        pe: (quote as any).trailingPE || null,
        pb: (quote as any).priceToBook || null,
      });
    } catch (e: any) {
      log(`Single stock scan error: ${e.message}`);
      res.status(500).json({ message: "Failed to scan stock" });
    }
  });

  app.post("/api/scan/gap-up-single", async (req, res) => {
    try {
      const rawSymbol = (req.body?.symbol || "").trim().toUpperCase();
      if (!rawSymbol) return res.status(400).json({ message: "Symbol is required" });
      const symbol = rawSymbol.endsWith(".NS") ? rawSymbol : `${rawSymbol}.NS`;

      const [quote, historicalData] = await Promise.all([
        getStockQuote(symbol),
        getHistoricalData(symbol, 3),
      ]);
      if (!quote) return res.status(404).json({ message: `Could not fetch data for ${symbol}` });

      const previousClose = quote.previousClose || 0;
      const todayOpen = quote.open || 0;
      const currentPrice = quote.price;
      if (previousClose <= 0 || todayOpen <= 0) return res.status(400).json({ message: "Insufficient price data" });

      const gapPercent = +((todayOpen - previousClose) / previousClose * 100).toFixed(2);
      const isValidGap = gapPercent >= 3.14;
      const priceAboveOpen = currentPrice > todayOpen;
      const greenCandle = currentPrice > previousClose;

      const rsi = historicalData.length >= 14 ? calculateRSI(historicalData) : 50;
      const avgVolume20 = historicalData.length >= 20
        ? historicalData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20
        : quote.volume;
      const volumeRatio = avgVolume20 > 0 ? +(quote.volume / avgVolume20).toFixed(1) : 1;
      const targetConservative = +(currentPrice * 1.0628).toFixed(2);
      const targetAggressive = +(currentPrice * 1.0314).toFixed(2);

      let signal: "BUY" | "SELL" | "WATCH" = "WATCH";
      let action = "No valid gap";
      if (isValidGap && priceAboveOpen && greenCandle) { signal = "BUY"; action = `Gap ${gapPercent}% confirmed — price above open`; }
      else if (isValidGap && !priceAboveOpen) { signal = "WATCH"; action = `Gap ${gapPercent}% — awaiting 3PM confirmation`; }
      else if (gapPercent >= 1 && gapPercent < 3.14) { action = `Minor gap ${gapPercent}% — below 3.14% threshold`; }
      else if (gapPercent < 0) { action = `Gap down ${gapPercent}% — no trade`; }

      res.json({
        symbol, name: quote.name, price: currentPrice,
        previousClose, todayOpen, gapPercent,
        isValidGap, priceAboveOpen, greenCandle,
        rsi: +rsi.toFixed(1), volumeRatio,
        targetConservative, targetAggressive,
        action, signal,
      });
    } catch (e: any) {
      log(`Gap Up single scan error: ${e.message}`);
      res.status(500).json({ message: "Failed to scan stock" });
    }
  });

  app.get("/api/portfolio", async (_req, res) => {
    try {
      const positions = await storage.getPortfolioPositions();
      res.json(positions);
    } catch (error: any) {
      log(`Error getting portfolio: ${error.message}`);
      res.status(500).json({ message: "Failed to get portfolio" });
    }
  });

  app.post("/api/portfolio", async (req, res) => {
    try {
      const parsed = insertPortfolioSchema.parse(req.body);
      const position = await storage.addPortfolioPosition(parsed);

      await storage.addTrade({
        symbol: parsed.symbol,
        name: parsed.name,
        quantity: parsed.quantity,
        entryPrice: parsed.entryPrice,
        exitPrice: null,
        pnl: null,
        strategy: parsed.strategyUsed,
        type: "BUY",
      });

      res.json(position);
    } catch (error: any) {
      log(`Error adding portfolio position: ${error.message}`);
      res.status(400).json({ message: error.message || "Failed to add position" });
    }
  });

  app.delete("/api/portfolio/:id", async (req, res) => {
    try {
      await storage.deletePortfolioPosition(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      log(`Error deleting position: ${error.message}`);
      res.status(500).json({ message: "Failed to delete position" });
    }
  });

  app.get("/api/trades", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const allTrades = await storage.getTrades(limit);
      res.json(allTrades);
    } catch (error: any) {
      log(`Error getting trades: ${error.message}`);
      res.status(500).json({ message: "Failed to get trades" });
    }
  });

  const NIFTY_NEXT50_SYMBOLS = [
    "ADANIPORTS.NS", "AMBUJACEM.NS", "AUROPHARMA.NS", "BANKBARODA.NS", "BEL.NS",
    "BERGEPAINT.NS", "BOSCHLTD.NS", "CANBK.NS", "CHOLAFIN.NS", "COLPAL.NS",
    "CONCOR.NS", "DLF.NS", "DIXON.NS", "GAIL.NS", "GODREJPROP.NS",
    "HAL.NS", "HDFCAMC.NS", "HDFCLIFE.NS", "IDFCFIRSTB.NS", "INDHOTEL.NS",
    "IOC.NS", "IRCTC.NS", "JINDALSTEL.NS", "JUBLFOOD.NS", "LICI.NS",
    "LTIM.NS", "LUPIN.NS", "MCDOWELL-N.NS", "MRF.NS", "MUTHOOTFIN.NS",
    "NAUKRI.NS", "OBEROIRLTY.NS", "OFSS.NS", "PAGEIND.NS", "PEL.NS",
    "PERSISTENT.NS", "PETRONET.NS", "PFC.NS", "PIIND.NS", "PNB.NS",
    "POLYCAB.NS", "RECLTD.NS", "SAIL.NS", "SHREECEM.NS", "SHRIRAMFIN.NS",
    "SIEMENS.NS", "SRF.NS", "TATAELXSI.NS", "TATAPOWER.NS", "TRENT.NS",
  ];

  const NIFTY_MIDCAP150_SYMBOLS = [
    "ABB.NS", "ACC.NS", "ABCAPITAL.NS", "ALKEM.NS", "ASTRAL.NS",
    "ATUL.NS", "BALKRISIND.NS", "BHARATFORG.NS", "BIOCON.NS", "CANFINHOME.NS",
    "COFORGE.NS", "COROMANDEL.NS", "CROMPTON.NS", "CESC.NS", "DALBHARAT.NS",
    "EMAMILTD.NS", "ENDURANCE.NS", "ESCORTS.NS", "EXIDEIND.NS", "FEDERALBNK.NS",
    "FORTIS.NS", "GMRINFRA.NS", "GNFC.NS", "GSPL.NS", "HONAUT.NS",
    "ICICIPRULI.NS", "IPCALAB.NS", "JKCEMENT.NS", "KANSAINER.NS", "KPITTECH.NS",
    "LAURUSLABS.NS", "LICHSGFIN.NS", "M&MFIN.NS", "MANAPPURAM.NS", "MARICO.NS",
    "MAXHEALTH.NS", "METROPOLIS.NS", "MFSL.NS", "MOTHERSON.NS", "MPHASIS.NS",
    "NATIONALUM.NS", "NHPC.NS", "NMDC.NS", "OIL.NS", "PAYTM.NS",
    "PHOENIXLTD.NS", "RAMCOCEM.NS", "SBICARD.NS", "SCHAEFFLER.NS", "SOLARINDS.NS",
    "SONACOMS.NS", "STARHEALTH.NS", "SUNDARMFIN.NS", "SUPREMEIND.NS", "SUNTV.NS",
    "TATACHEM.NS", "TIMKEN.NS", "TORNTPOWER.NS", "TVSMOTOR.NS", "UBL.NS",
    "VEDL.NS", "VOLTAS.NS", "ZOMATO.NS", "ZYDUSLIFE.NS", "DEEPAKNTR.NS",
    "CUMMINSIND.NS", "GLAND.NS", "PRESTIGE.NS", "UNIONBANK.NS", "NAVINFLUOR.NS",
    "TORNTPHARM.NS", "SYNGENE.NS", "CARBORUNIV.NS", "IEX.NS", "JSL.NS",
  ];

  const DMA_FULL_UNIVERSE = Array.from(new Set([...NIFTY_100_SYMBOLS, ...NIFTY_NEXT50_SYMBOLS, ...NIFTY_MIDCAP150_SYMBOLS]));

  // ======================== NIFTY DMA STRATEGY ENDPOINTS ========================
  app.get("/api/nifty-dma/state", (_req, res) => {
    res.json(niftyDmaService.getState());
  });

  app.post("/api/nifty-dma/capital", (req, res) => {
    const { total } = req.body;
    if (total && typeof total === "number") {
      res.json(niftyDmaService.updateCapital(total));
    } else {
      res.status(400).json({ message: "Invalid capital total" });
    }
  });

  app.post("/api/scan/dma", async (req, res) => {
    try {
      // Use explicit NIFTY LargeMidcap 250 Universe
      const { execute = false } = req.body;
      const result = await niftyDmaService.scanAndTrade(NIFTY_LARGEMIDCAP_250_SYMBOLS, execute);
      
      // Map to old response format for partial compatibility if needed, 
      // OR update frontend to use new structure. 
      // The frontend uses "all_results", "buy_count", etc.
      // Let's return the full state + scan results
      
      const { state, scanResults } = result;
      
      // Compatibility mapping
      const buyStocks = scanResults.buyList;
      const allResults = [
          ...buyStocks.map((s: any) => ({ ...s, signal: "DMA_BUY" })),
          // Add others if we had full list, but service only returns buyList for efficiency?
          // The service returns "buyList" which are new opportunities.
      ];

      res.json({
        success: true,
        state,
        scanResults,
        // Legacy fields for basic compatibility (though frontend will be updated)
        total_scanned: NIFTY_LARGEMIDCAP_250_SYMBOLS.length,
        buy_count: buyStocks.length,
        all_results: allResults
      });
    } catch (error: any) {
      log(`DMA scan failed: ${error.message}`);
      res.status(500).json({ message: "DMA scan failed: " + error.message });
    }
  });

  app.post("/api/scan/nifty-dma-car", async (req, res) => {
    try {
      const { investedCapital = 15000 } = req.body;
      let dmaState = niftyDmaService.getState();

      if (!dmaState.lastScanResults?.buyList?.length) {
        await niftyDmaService.scanAndTrade(NIFTY_LARGEMIDCAP_250_SYMBOLS, false);
        dmaState = niftyDmaService.getState();
      }

      const buyList = dmaState.lastScanResults?.buyList || [];
      log(`Running CAR analysis on ${buyList.length} Nifty DMA stocks...`);
      
      const results: any[] = [];
      const batchSize = 5;

      for (let i = 0; i < buyList.length; i += batchSize) {
        const batch = buyList.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (stock: any) => {
            try {
              const history = await getHistoricalData(stock.symbol, 30);
              if (!history || history.length < 15) return;
              
              const carResult = calculateCAR(history, investedCapital);
              const last10Dates = history.slice(-10).map((d) => {
                const dt = d.date instanceof Date ? d.date : new Date(d.date);
                return dt.toISOString().split("T")[0];
              });
              
              if (carResult.carSignal === "STRONG_BUY") {
                 results.push({
                    ...stock,
                    ...carResult,
                    last10Dates
                 });
              }
            } catch (e) {
              // ignore
            }
          })
        );
      }
      
      // Sort by price ascending
      results.sort((a, b) => a.ltp - b.ltp);

      res.json({
        total_scanned: buyList.length,
        passed_count: results.length,
        results,
        message: buyList.length ? undefined : "No DMA buy candidates found in latest scan."
      });

    } catch (error: any) {
      log(`Nifty DMA CAR scan failed: ${error.message}`);
      res.status(500).json({ message: "Scan failed: " + error.message });
    }
  });

  app.post("/api/scan/dma-compound", async (req, res) => {
    try {
      const {
        startingCapital = 15000,
        brokeragePerTrade = 20,
        targetPercent = 6.28,
        profitSplitPercent = 50,
        goalCapital = 10000000,
      } = req.body || {};

      const result = calculateCompounding(
        startingCapital, brokeragePerTrade, targetPercent, profitSplitPercent, goalCapital
      );
      res.json(result);
    } catch (error: any) {
      log(`DMA Compounding failed: ${error.message}`);
      res.status(500).json({ message: "Compounding calculation failed" });
    }
  });

  // ======================== CLASS 10 — HOMA GENIUS METHOD (Multi-ETF) ========================
  app.post("/api/scan/homa-genius", async (req, res) => {
    try {
      const {
        totalCapital = 120000,
        parts = 12,
        profitTargetPercent = 3
      } = req.body;

      const ETFs = [
        { symbol: "NIFTYBEES.NS", name: "Nifty ETF", activeDay: 4 },
        { symbol: "BANKBEES.NS", name: "Bank ETF", activeDay: 3 },
        { symbol: "FINNIFTYBEES.NS", name: "Fin Nifty ETF", activeDay: 2 },
        { symbol: "MIDCAPETF.NS", name: "Midcap ETF", activeDay: 1 },
        { symbol: "SENSEXETF.NS", name: "Sensex ETF", activeDay: 5 }
      ];

      const today = new Date();
      const currentWeekday = today.getDay();

      log(`Running Parallel Homa Genius Scan (Weekday: ${currentWeekday})...`);

      const openPositions = await storage.getPortfolioPositions();
      const homaPositions = openPositions.filter(p => p.isActive && p.strategyUsed === "HOMA_GENIUS");

      const historicalTrades = await storage.getTrades(1000);
      const totalRealProfitValue = historicalTrades
        .filter(t => t.strategy === "HOMA_GENIUS" && t.type === "SELL")
        .reduce((sum, t) => sum + (t.pnl || 0), 0);

      // Parallel Strategy Check
      const allResolvedResults = await Promise.all(ETFs.map(async (etfInfo) => {
        const { symbol, name, activeDay } = etfInfo;
        try {
          // Fetch historical data
          const dailyData = await getHistoricalData(symbol, 3, "1d");

          if (!dailyData || dailyData.length < 5) {
            return { symbol, name, currentLTP: 0, candleType: "No Data", buySignal: "NO", sellSignal: "NO", partsUsed: 0, remainingParts: (parts || 12), etfExposurePercent: 0, isActiveToday: false, invested: 0, unrealized: 0 };
          }

          const cycleDays = dailyData.slice(-5);
          const cycleOpen = cycleDays[0].open || 0;
          const cycleClose = cycleDays[cycleDays.length - 1].close || 0;
          const currentLTP = cycleClose;

          const candleType = cycleClose < cycleOpen ? "Bearish" : "Bullish";
          const isActiveToday = currentWeekday === activeDay;

          const etfPositions = homaPositions.filter(p => p.symbol === symbol);
          const partsUsedCount = etfPositions.length;
          const remainingPartsCount = Math.max(0, (parts || 12) - partsUsedCount);

          let etfInvestedValue = 0;
          let etfUnrealizedValue = 0;

          etfPositions.forEach(pos => {
            const entryP = pos.entryPrice || 0;
            const unrealPL = (currentLTP - entryP) * (pos.quantity || 0);
            etfInvestedValue += (entryP * (pos.quantity || 0));
            etfUnrealizedValue += unrealPL;
          });

          const hasTargetHit = etfPositions.some(p => currentLTP >= (p.entryPrice * (1 + (profitTargetPercent / 100))));
          const etfTargetPrice = currentLTP * (1 + (profitTargetPercent / 100));

          const sellSignal = hasTargetHit ? "YES" : "NO";
          const buySignal = (isActiveToday && candleType === "Bearish" && remainingPartsCount > 0) ? "YES" : "NO";

          const etfCapLimit = totalCapital / ETFs.length;
          const etfExposurePerc = etfCapLimit > 0 ? (etfInvestedValue / etfCapLimit) * 100 : 0;

          return {
            symbol,
            name,
            currentLTP: Number(currentLTP.toFixed(2)),
            cycleOpen: Number(cycleOpen.toFixed(2)),
            cycleClose: Number(cycleClose.toFixed(2)),
            candleType,
            buySignal,
            sellSignal,
            partsUsed: partsUsedCount,
            remainingParts: remainingPartsCount,
            etfExposurePercent: Number(etfExposurePerc.toFixed(2)),
            isActiveToday,
            invested: etfInvestedValue,
            unrealized: etfUnrealizedValue,
            targetPrice: isActiveToday ? Number(etfTargetPrice.toFixed(2)) : 0
          };
        } catch (e: any) {
          log(`Error scanning ${symbol}: ${e.message}`);
          return { symbol, name, currentLTP: 0, candleType: "Error", buySignal: "NO", sellSignal: "NO", partsUsed: 0, remainingParts: (parts || 12), etfExposurePercent: 0, isActiveToday: false, invested: 0, unrealized: 0 };
        }
      }));

      const validResults = allResolvedResults.filter(Boolean);

      // Aggregate totals after parallel section to avoid race conditions
      const totalInv = validResults.reduce((sum, r) => sum + (r?.invested || 0), 0);
      const totalUnrealizedPL = validResults.reduce((sum, r) => sum + (r?.unrealized || 0), 0);
      const totalExposurePerc = totalCapital > 0 ? (totalInv / totalCapital) * 100 : 0;
      const activeNames = validResults.filter(r => r && r.partsUsed > 0).map(r => r!.name);

      res.json({
        success: true,
        activeETFToday: validResults.find(r => r?.isActiveToday) || null,
        etfResults: validResults,
        portfolioSummary: {
          totalCapitalDeployed: Number(totalInv.toFixed(2)),
          totalRealizedProfit: Number(totalRealProfitValue.toFixed(2)),
          totalUnrealizedProfit: Number(totalUnrealizedPL.toFixed(2)),
          totalExposurePercent: Number(totalExposurePerc.toFixed(2)),
          activeETFs: activeNames.join(", ") || "None",
          riskWarning: totalExposurePerc > 80 ? "WARNING: Portfolio exposure exceeds 80%" : "Low Risk",
          maxDrawdownPercent: totalInv > 0 ? Number(Math.min(0, (totalUnrealizedPL / totalInv) * 100).toFixed(2)) : 0,
          totalPartsUsedAcrossAll: validResults.reduce((sum, r) => sum + (r?.partsUsed || 0), 0)
        }
      });

    } catch (error: any) {
      log(`Homa Genius scan failed: ${error.message}`);
      res.status(500).json({ message: "Homa Genius scan failed: " + error.message });
    }
  });


  app.post("/api/scan/car", async (req, res) => {
    try {
      const { symbol, investedCapital = 15000 } = req.body;
      if (!symbol) return res.status(400).json({ message: "Symbol is required" });

      const sym = symbol.toUpperCase().endsWith(".NS") ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
      log(`Running Smart CAR analysis for ${sym}...`);

      const [quote, history] = await Promise.all([
        getStockQuote(sym),
        getHistoricalData(sym, 13),
      ]);

      if (!history || history.length < 30) {
        return res.status(400).json({ message: "Insufficient historical data for " + sym });
      }

      const price = quote?.price || history[history.length - 1].close;
      const name = quote?.name || sym.replace(".NS", "");
      const carResult = calculateCAR(history, investedCapital);

      res.json({
        symbol: sym, name,
        currentPrice: parseFloat(price.toFixed(2)),
        ...carResult,
      });
    } catch (error: any) {
      log(`CAR analysis failed: ${error.message}`);
      res.status(500).json({ message: "CAR analysis failed: " + error.message });
    }
  });

  app.post("/api/scan/dma-car", async (req, res) => {
    try {
      const { capitalPerStock = 20000, investedCapital = 15000 } = req.body || {};
      log("Starting DMA+CAR 2-Phase scan...");

      const batchSize = 5;
      const phase1Results: any[] = [];

      for (let i = 0; i < DMA_FULL_UNIVERSE.length; i += batchSize) {
        const batch = DMA_FULL_UNIVERSE.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (symbol) => {
            try {
              const [quote, history] = await Promise.all([
                getStockQuote(symbol),
                getHistoricalData(symbol, 13),
              ]);
              if (!history || history.length < 200) return null;

              const price = quote?.price || history[history.length - 1].close;
              const dmaResult = calculateDMASignal(history);
              if (dmaResult.signal !== "DMA_BUY") return null;

              const name = quote?.name || symbol.replace(".NS", "");
              const carResult = calculateCAR(history, investedCapital);
              const last10Dates = history.slice(-10).map((d) => {
                const dt = d.date instanceof Date ? d.date : new Date(d.date);
                return dt.toISOString().split("T")[0];
              });

              return {
                symbol, name, price: parseFloat(price.toFixed(2)),
                ma50: parseFloat(dmaResult.ma50.toFixed(2)),
                ma100: parseFloat(dmaResult.ma100.toFixed(2)),
                ma200: parseFloat(dmaResult.ma200.toFixed(2)),
                distanceFrom200: parseFloat(dmaResult.distanceFrom200.toFixed(2)),
                dmaSignal: dmaResult.signal,
                target628: dmaResult.target628,
                high52Week: carResult.high52Week,
                highDate: carResult.highDate,
                carSignal: carResult.carSignal,
                last10CAR: carResult.last10CAR,
                last10Dates,
                averageAmount: carResult.averageAmount,
                recommendedShares: carResult.recommendedShares,
                capitalAlloc: capitalPerStock,
                shares: Math.floor(capitalPerStock / price) || 1,
              };
            } catch (e: any) {
              log(`DMA+CAR error for ${symbol}: ${e.message}`);
              return null;
            }
          })
        );
        phase1Results.push(...batchResults.filter(Boolean));
        if (i + batchSize < DMA_FULL_UNIVERSE.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      phase1Results.sort((a, b) => a.distanceFrom200 - b.distanceFrom200);
      const strongBuys = phase1Results.filter((r) => r.carSignal === "STRONG_BUY");

      for (const r of strongBuys.slice(0, 20)) {
        await storage.addSignal({
          symbol: r.symbol, strategy: "dma-car", signal: "BUY", companyName: r.name,
          price: r.price, details: `STRONG BUY (DMA+CAR) | Dist: ${r.distanceFrom200}% | Target: ₹${r.target628}`,
        });
      }

      res.json({
        total_scanned: DMA_FULL_UNIVERSE.length,
        dma_buy_count: phase1Results.length,
        strong_buy_count: strongBuys.length,
        all_results: phase1Results,
        strong_buys: strongBuys,
      });
    } catch (error: any) {
      log(`DMA+CAR scan failed: ${error.message}`);
      res.status(500).json({ message: "DMA+CAR scan failed: " + error.message });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const [sigs, watchlist] = await Promise.all([
        storage.getSignals(1000),
        storage.getWatchlist(),
      ]);
      const buySignals = sigs.filter((s) => s.signal === "BUY").length;
      const sellSignals = sigs.filter((s) => s.signal === "SELL").length;
      const watchSignals = sigs.filter((s) => s.signal === "WATCH").length;

      res.json({
        activeSignals: sigs.length,
        strategies: 20,
        niftyStocks: watchlist.length,
        scanStatus: sigs.length > 0 ? "Active" : "Idle",
        buySignals,
        sellSignals,
        watchSignals,
      });
    } catch (error: any) {
      log(`Error getting stats: ${error.message}`);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  return httpServer;
}
