/**
 * MaxClaim Regional Configuration System
 * Copyright (c) 2024 MaxClaim. All rights reserved.
 * 
 * State-to-regions mapping with adjacency data for partner coverage areas.
 * Supports Standard (2 adjacent + 1 non-adjacent) and Premium (4 adjacent + 4 non-adjacent) plans.
 */

export interface RegionData {
  cities: string[];
  zipPrefixes: string[];
}

export interface StateRegions {
  [region: string]: RegionData;
}

export interface RegionAdjacency {
  default: string;
  adjacent: string[];
  nonAdjacent: string[];
}

export interface StateAdjacencyMap {
  [region: string]: RegionAdjacency;
}

export const STATE_REGIONS: Record<string, StateRegions> = {
  TX: {
    'North Texas': {
      cities: ['Dallas', 'Fort Worth', 'Arlington', 'Plano', 'Garland', 'Irving', 'Frisco', 'McKinney'],
      zipPrefixes: ['750', '751', '752', '753', '754', '760', '761', '762']
    },
    'Houston Metro': {
      cities: ['Houston', 'Katy', 'The Woodlands', 'Sugar Land', 'Pasadena', 'Pearland', 'League City'],
      zipPrefixes: ['770', '771', '772', '773', '774', '775', '776', '777']
    },
    'Austin Area': {
      cities: ['Austin', 'Round Rock', 'Cedar Park', 'Pflugerville', 'Georgetown', 'San Marcos'],
      zipPrefixes: ['786', '787', '788', '789']
    },
    'San Antonio Area': {
      cities: ['San Antonio', 'New Braunfels', 'Boerne', 'Seguin', 'Schertz'],
      zipPrefixes: ['780', '781', '782', '783', '784', '785']
    },
    'Dallas-Fort Worth Metroplex': {
      cities: ['Denton', 'Lewisville', 'Coppell', 'Grand Prairie', 'Mansfield', 'Mesquite'],
      zipPrefixes: ['755', '756', '757', '758', '759', '763', '764', '765']
    },
    'East Texas': {
      cities: ['Tyler', 'Longview', 'Marshall', 'Texarkana', 'Nacogdoches'],
      zipPrefixes: ['755', '756', '757', '758']
    },
    'West Texas': {
      cities: ['El Paso', 'Midland', 'Odessa', 'Lubbock', 'Amarillo', 'Abilene'],
      zipPrefixes: ['790', '791', '792', '793', '794', '795', '796', '797', '798', '799']
    },
    'South Texas': {
      cities: ['Corpus Christi', 'Brownsville', 'McAllen', 'Harlingen', 'Laredo'],
      zipPrefixes: ['783', '784', '785', '788']
    }
  },
  
  FL: {
    'South Florida': {
      cities: ['Miami', 'Fort Lauderdale', 'West Palm Beach', 'Deerfield Beach', 'Boca Raton', 'Hollywood'],
      zipPrefixes: ['330', '331', '332', '333', '334']
    },
    'Central Florida': {
      cities: ['Orlando', 'Tampa', 'St. Petersburg', 'Clearwater', 'Lakeland', 'Kissimmee'],
      zipPrefixes: ['327', '328', '336', '337', '338', '346', '347']
    },
    'Jacksonville Area': {
      cities: ['Jacksonville', 'Neptune Beach', 'Ponte Vedra', 'St. Augustine', 'Orange Park'],
      zipPrefixes: ['320', '321', '322']
    },
    'Southwest Florida': {
      cities: ['Naples', 'Fort Myers', 'Bonita Springs', 'Cape Coral', 'Sarasota'],
      zipPrefixes: ['339', '340', '341', '342']
    },
    'Panhandle': {
      cities: ['Pensacola', 'Panama City', 'Destin', 'Tallahassee', 'Fort Walton Beach'],
      zipPrefixes: ['323', '324', '325', '326']
    }
  },
  
  CA: {
    'Bay Area': {
      cities: ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Mountain View', 'Palo Alto', 'Fremont'],
      zipPrefixes: ['940', '941', '942', '943', '944', '945', '946', '947', '948', '949', '950', '951']
    },
    'Los Angeles Metro': {
      cities: ['Los Angeles', 'Long Beach', 'Pasadena', 'Santa Monica', 'Burbank', 'Glendale', 'Torrance'],
      zipPrefixes: ['900', '901', '902', '903', '904', '905', '906', '907', '908', '910', '911', '912', '913', '914', '915', '916', '917', '918']
    },
    'San Diego Area': {
      cities: ['San Diego', 'Chula Vista', 'Encinitas', 'Carlsbad', 'Oceanside', 'Escondido'],
      zipPrefixes: ['919', '920', '921', '922']
    },
    'Central Valley': {
      cities: ['Fresno', 'Modesto', 'Sacramento', 'Stockton', 'Bakersfield', 'Visalia'],
      zipPrefixes: ['930', '931', '932', '933', '934', '935', '936', '937', '938', '939', '952', '953', '954', '955', '956', '957', '958', '959']
    },
    'Inland Empire': {
      cities: ['Riverside', 'San Bernardino', 'Ontario', 'Fontana', 'Rancho Cucamonga', 'Corona'],
      zipPrefixes: ['923', '924', '925', '926', '927']
    },
    'Northern California': {
      cities: ['Redding', 'Chico', 'Santa Rosa', 'Napa', 'Eureka'],
      zipPrefixes: ['959', '960', '961']
    }
  },
  
  OK: {
    'Oklahoma City Metro': {
      cities: ['Oklahoma City', 'Edmond', 'Norman', 'Moore', 'Midwest City', 'Del City'],
      zipPrefixes: ['730', '731', '734', '735']
    },
    'Tulsa Area': {
      cities: ['Tulsa', 'Broken Arrow', 'Owasso', 'Sapulpa', 'Jenks', 'Bixby'],
      zipPrefixes: ['740', '741', '743', '744']
    },
    'Southwest Oklahoma': {
      cities: ['Lawton', 'Altus', 'Duncan', 'Chickasha'],
      zipPrefixes: ['732', '733', '736', '737']
    },
    'Northeast Oklahoma': {
      cities: ['Muskogee', 'Tahlequah', 'Bartlesville', 'Claremore', 'Miami'],
      zipPrefixes: ['743', '744', '745', '746']
    }
  },
  
  MS: {
    'Jackson Metro': {
      cities: ['Jackson', 'Madison', 'Pearl', 'Flowood', 'Brandon', 'Clinton'],
      zipPrefixes: ['390', '391', '392']
    },
    'Gulf Coast': {
      cities: ['Biloxi', 'Gulfport', 'Ocean Springs', 'Pascagoula', 'Hattiesburg'],
      zipPrefixes: ['394', '395']
    },
    'Northern Mississippi': {
      cities: ['Tupelo', 'Oxford', 'Southaven', 'Olive Branch', 'Columbus'],
      zipPrefixes: ['386', '387', '388', '389']
    },
    'Delta Region': {
      cities: ['Greenville', 'Clarksdale', 'Cleveland', 'Greenwood', 'Vicksburg'],
      zipPrefixes: ['387', '388', '389', '390', '391']
    }
  },
  
  IL: {
    'Chicago Metro': {
      cities: ['Chicago', 'Oak Park', 'Evanston', 'Arlington Heights', 'Naperville', 'Schaumburg', 'Aurora'],
      zipPrefixes: ['600', '601', '602', '603', '604', '605', '606']
    },
    'Northern Illinois': {
      cities: ['Rockford', 'DeKalb', 'Elgin', 'Waukegan', 'Crystal Lake'],
      zipPrefixes: ['610', '611', '612']
    },
    'Central Illinois': {
      cities: ['Springfield', 'Champaign', 'Urbana', 'Peoria', 'Bloomington', 'Decatur'],
      zipPrefixes: ['616', '617', '618', '619', '626', '627']
    },
    'Southern Illinois': {
      cities: ['Carbondale', 'Belleville', 'Edwardsville', 'East St. Louis', 'Marion'],
      zipPrefixes: ['620', '622', '623', '624', '625', '628', '629']
    }
  },
  
  MO: {
    'Kansas City Metro': {
      cities: ['Kansas City', 'Independence', 'Lees Summit', 'Blue Springs', 'Liberty', 'Raytown'],
      zipPrefixes: ['640', '641', '644', '660', '661', '662', '664']
    },
    'St. Louis Metro': {
      cities: ['St. Louis', 'Clayton', 'Webster Groves', 'Kirkwood', 'Florissant', 'Chesterfield'],
      zipPrefixes: ['630', '631', '633', '634', '635', '636', '637', '638']
    },
    'Springfield Area': {
      cities: ['Springfield', 'Branson', 'Joplin', 'Nixa', 'Republic'],
      zipPrefixes: ['648', '649', '656', '657', '658']
    },
    'Central Missouri': {
      cities: ['Columbia', 'Jefferson City', 'Rolla', 'Sedalia'],
      zipPrefixes: ['650', '651', '652', '653', '654', '655']
    }
  },
  
  VA: {
    'Northern Virginia': {
      cities: ['Arlington', 'Alexandria', 'Fairfax', 'Leesburg', 'Reston', 'Herndon', 'McLean'],
      zipPrefixes: ['201', '220', '221', '222', '223']
    },
    'Richmond Area': {
      cities: ['Richmond', 'Henrico', 'Midlothian', 'Chesterfield', 'Glen Allen'],
      zipPrefixes: ['230', '231', '232', '233', '234']
    },
    'Hampton Roads': {
      cities: ['Norfolk', 'Virginia Beach', 'Newport News', 'Hampton', 'Chesapeake', 'Suffolk'],
      zipPrefixes: ['233', '234', '235', '236', '237']
    },
    'Southwest Virginia': {
      cities: ['Roanoke', 'Blacksburg', 'Bristol', 'Lynchburg', 'Salem'],
      zipPrefixes: ['240', '241', '242', '243', '244', '245', '246']
    }
  },
  
  GA: {
    'Atlanta Metro': {
      cities: ['Atlanta', 'Marietta', 'Kennesaw', 'Sandy Springs', 'Decatur', 'Smyrna', 'Brookhaven'],
      zipPrefixes: ['300', '303', '310', '311', '312']
    },
    'North Georgia': {
      cities: ['Alpharetta', 'Roswell', 'Cumming', 'Johns Creek', 'Gainesville', 'Dalton'],
      zipPrefixes: ['301', '302', '305', '306']
    },
    'Savannah Area': {
      cities: ['Savannah', 'Richmond Hill', 'Pooler', 'Hinesville', 'Statesboro'],
      zipPrefixes: ['313', '314', '315']
    },
    'Augusta Area': {
      cities: ['Augusta', 'Martinez', 'Evans', 'Grovetown'],
      zipPrefixes: ['308', '309']
    },
    'Columbus Area': {
      cities: ['Columbus', 'Phenix City', 'Fort Benning'],
      zipPrefixes: ['318', '319']
    }
  },
  
  NC: {
    'Charlotte Metro': {
      cities: ['Charlotte', 'Concord', 'Huntersville', 'Gastonia', 'Rock Hill', 'Matthews'],
      zipPrefixes: ['280', '281', '282']
    },
    'Raleigh-Durham-Chapel Hill': {
      cities: ['Raleigh', 'Durham', 'Chapel Hill', 'Cary', 'Wake Forest', 'Apex'],
      zipPrefixes: ['275', '276', '277']
    },
    'Greensboro Area': {
      cities: ['Greensboro', 'High Point', 'Winston-Salem', 'Burlington'],
      zipPrefixes: ['270', '271', '272', '273', '274']
    },
    'Coastal': {
      cities: ['Wilmington', 'Wrightsville Beach', 'Jacksonville', 'New Bern', 'Greenville'],
      zipPrefixes: ['283', '284', '285', '286', '287']
    },
    'Western NC': {
      cities: ['Asheville', 'Boone', 'Hendersonville', 'Hickory'],
      zipPrefixes: ['287', '288', '289']
    }
  },
  
  NY: {
    'New York City': {
      cities: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
      zipPrefixes: ['100', '101', '102', '103', '104', '110', '111', '112', '113', '114', '116']
    },
    'Long Island': {
      cities: ['Hempstead', 'Garden City', 'Freeport', 'Hicksville', 'Levittown', 'Babylon'],
      zipPrefixes: ['115', '117', '118', '119']
    },
    'Hudson Valley': {
      cities: ['Yonkers', 'White Plains', 'New Rochelle', 'Mount Vernon', 'Poughkeepsie'],
      zipPrefixes: ['105', '106', '107', '108', '109', '125', '126', '127']
    },
    'Buffalo Area': {
      cities: ['Buffalo', 'Niagara Falls', 'Amherst', 'Cheektowaga', 'Tonawanda'],
      zipPrefixes: ['140', '141', '142', '143']
    },
    'Rochester-Syracuse': {
      cities: ['Rochester', 'Syracuse', 'Utica', 'Albany', 'Schenectady'],
      zipPrefixes: ['120', '121', '122', '123', '130', '131', '132', '133', '144', '145', '146', '147']
    }
  },
  
  CO: {
    'Denver Metro': {
      cities: ['Denver', 'Aurora', 'Lakewood', 'Boulder', 'Westminster', 'Arvada', 'Thornton'],
      zipPrefixes: ['800', '801', '802', '803', '804', '805']
    },
    'Front Range': {
      cities: ['Colorado Springs', 'Fort Collins', 'Greeley', 'Loveland', 'Longmont'],
      zipPrefixes: ['806', '808', '809']
    },
    'Western Colorado': {
      cities: ['Grand Junction', 'Aspen', 'Vail', 'Durango', 'Montrose'],
      zipPrefixes: ['814', '815', '816']
    },
    'Southern Colorado': {
      cities: ['Pueblo', 'Trinidad', 'Canon City'],
      zipPrefixes: ['810', '811', '812', '813']
    }
  },
  
  WA: {
    'Seattle Metro': {
      cities: ['Seattle', 'Bellevue', 'Redmond', 'Kirkland', 'Renton', 'Kent', 'Federal Way'],
      zipPrefixes: ['980', '981', '982']
    },
    'Tacoma Area': {
      cities: ['Tacoma', 'Olympia', 'Lakewood', 'Puyallup', 'Bremerton'],
      zipPrefixes: ['983', '984', '985']
    },
    'Vancouver Area': {
      cities: ['Vancouver', 'Camas', 'Battle Ground', 'Longview', 'Kelso'],
      zipPrefixes: ['986']
    },
    'Spokane Area': {
      cities: ['Spokane', 'Spokane Valley', 'Liberty Lake', 'Cheney'],
      zipPrefixes: ['990', '991', '992', '993', '994']
    },
    'Central Washington': {
      cities: ['Yakima', 'Wenatchee', 'Ellensburg', 'Kennewick', 'Richland'],
      zipPrefixes: ['988', '989', '993']
    }
  },
  
  LA: {
    'New Orleans Metro': {
      cities: ['New Orleans', 'Metairie', 'Kenner', 'Marrero', 'Chalmette'],
      zipPrefixes: ['700', '701']
    },
    'Baton Rouge Area': {
      cities: ['Baton Rouge', 'Prairieville', 'Denham Springs', 'Gonzales', 'Port Allen'],
      zipPrefixes: ['707', '708']
    },
    'Shreveport-Bossier': {
      cities: ['Shreveport', 'Bossier City', 'Minden', 'Ruston'],
      zipPrefixes: ['710', '711', '712']
    },
    'Acadiana': {
      cities: ['Lafayette', 'Lake Charles', 'New Iberia', 'Opelousas'],
      zipPrefixes: ['705', '706']
    }
  }
};

export const REGION_ADJACENCY: Record<string, StateAdjacencyMap> = {
  TX: {
    'North Texas': {
      default: 'North Texas',
      adjacent: ['Dallas-Fort Worth Metroplex', 'East Texas', 'West Texas'],
      nonAdjacent: ['Austin Area', 'Houston Metro', 'San Antonio Area', 'South Texas']
    },
    'Houston Metro': {
      default: 'Houston Metro',
      adjacent: ['Austin Area', 'East Texas', 'South Texas'],
      nonAdjacent: ['North Texas', 'Dallas-Fort Worth Metroplex', 'San Antonio Area', 'West Texas']
    },
    'Austin Area': {
      default: 'Austin Area',
      adjacent: ['San Antonio Area', 'Houston Metro', 'Dallas-Fort Worth Metroplex'],
      nonAdjacent: ['North Texas', 'East Texas', 'West Texas', 'South Texas']
    },
    'San Antonio Area': {
      default: 'San Antonio Area',
      adjacent: ['Austin Area', 'South Texas', 'West Texas'],
      nonAdjacent: ['North Texas', 'Dallas-Fort Worth Metroplex', 'Houston Metro', 'East Texas']
    },
    'Dallas-Fort Worth Metroplex': {
      default: 'Dallas-Fort Worth Metroplex',
      adjacent: ['North Texas', 'Austin Area', 'East Texas'],
      nonAdjacent: ['Houston Metro', 'San Antonio Area', 'West Texas', 'South Texas']
    },
    'East Texas': {
      default: 'East Texas',
      adjacent: ['North Texas', 'Houston Metro', 'Dallas-Fort Worth Metroplex'],
      nonAdjacent: ['Austin Area', 'San Antonio Area', 'West Texas', 'South Texas']
    },
    'West Texas': {
      default: 'West Texas',
      adjacent: ['North Texas', 'San Antonio Area'],
      nonAdjacent: ['Austin Area', 'Houston Metro', 'Dallas-Fort Worth Metroplex', 'East Texas', 'South Texas']
    },
    'South Texas': {
      default: 'South Texas',
      adjacent: ['San Antonio Area', 'Houston Metro'],
      nonAdjacent: ['North Texas', 'Dallas-Fort Worth Metroplex', 'Austin Area', 'East Texas', 'West Texas']
    }
  },
  
  FL: {
    'South Florida': {
      default: 'South Florida',
      adjacent: ['Southwest Florida', 'Central Florida'],
      nonAdjacent: ['Jacksonville Area', 'Panhandle']
    },
    'Central Florida': {
      default: 'Central Florida',
      adjacent: ['South Florida', 'Southwest Florida', 'Jacksonville Area'],
      nonAdjacent: ['Panhandle']
    },
    'Jacksonville Area': {
      default: 'Jacksonville Area',
      adjacent: ['Central Florida', 'Panhandle'],
      nonAdjacent: ['South Florida', 'Southwest Florida']
    },
    'Southwest Florida': {
      default: 'Southwest Florida',
      adjacent: ['South Florida', 'Central Florida'],
      nonAdjacent: ['Jacksonville Area', 'Panhandle']
    },
    'Panhandle': {
      default: 'Panhandle',
      adjacent: ['Jacksonville Area', 'Central Florida'],
      nonAdjacent: ['South Florida', 'Southwest Florida']
    }
  },
  
  CA: {
    'Bay Area': {
      default: 'Bay Area',
      adjacent: ['Central Valley', 'Northern California'],
      nonAdjacent: ['Los Angeles Metro', 'San Diego Area', 'Inland Empire']
    },
    'Los Angeles Metro': {
      default: 'Los Angeles Metro',
      adjacent: ['Inland Empire', 'San Diego Area', 'Central Valley'],
      nonAdjacent: ['Bay Area', 'Northern California']
    },
    'San Diego Area': {
      default: 'San Diego Area',
      adjacent: ['Los Angeles Metro', 'Inland Empire'],
      nonAdjacent: ['Bay Area', 'Central Valley', 'Northern California']
    },
    'Central Valley': {
      default: 'Central Valley',
      adjacent: ['Bay Area', 'Los Angeles Metro', 'Northern California'],
      nonAdjacent: ['San Diego Area', 'Inland Empire']
    },
    'Inland Empire': {
      default: 'Inland Empire',
      adjacent: ['Los Angeles Metro', 'San Diego Area', 'Central Valley'],
      nonAdjacent: ['Bay Area', 'Northern California']
    },
    'Northern California': {
      default: 'Northern California',
      adjacent: ['Bay Area', 'Central Valley'],
      nonAdjacent: ['Los Angeles Metro', 'San Diego Area', 'Inland Empire']
    }
  },
  
  OK: {
    'Oklahoma City Metro': {
      default: 'Oklahoma City Metro',
      adjacent: ['Tulsa Area', 'Southwest Oklahoma'],
      nonAdjacent: ['Northeast Oklahoma']
    },
    'Tulsa Area': {
      default: 'Tulsa Area',
      adjacent: ['Oklahoma City Metro', 'Northeast Oklahoma'],
      nonAdjacent: ['Southwest Oklahoma']
    },
    'Southwest Oklahoma': {
      default: 'Southwest Oklahoma',
      adjacent: ['Oklahoma City Metro'],
      nonAdjacent: ['Tulsa Area', 'Northeast Oklahoma']
    },
    'Northeast Oklahoma': {
      default: 'Northeast Oklahoma',
      adjacent: ['Tulsa Area'],
      nonAdjacent: ['Oklahoma City Metro', 'Southwest Oklahoma']
    }
  },
  
  MS: {
    'Jackson Metro': {
      default: 'Jackson Metro',
      adjacent: ['Delta Region', 'Gulf Coast'],
      nonAdjacent: ['Northern Mississippi']
    },
    'Gulf Coast': {
      default: 'Gulf Coast',
      adjacent: ['Jackson Metro'],
      nonAdjacent: ['Northern Mississippi', 'Delta Region']
    },
    'Northern Mississippi': {
      default: 'Northern Mississippi',
      adjacent: ['Delta Region', 'Jackson Metro'],
      nonAdjacent: ['Gulf Coast']
    },
    'Delta Region': {
      default: 'Delta Region',
      adjacent: ['Jackson Metro', 'Northern Mississippi'],
      nonAdjacent: ['Gulf Coast']
    }
  },
  
  IL: {
    'Chicago Metro': {
      default: 'Chicago Metro',
      adjacent: ['Northern Illinois', 'Central Illinois'],
      nonAdjacent: ['Southern Illinois']
    },
    'Northern Illinois': {
      default: 'Northern Illinois',
      adjacent: ['Chicago Metro', 'Central Illinois'],
      nonAdjacent: ['Southern Illinois']
    },
    'Central Illinois': {
      default: 'Central Illinois',
      adjacent: ['Chicago Metro', 'Northern Illinois', 'Southern Illinois'],
      nonAdjacent: []
    },
    'Southern Illinois': {
      default: 'Southern Illinois',
      adjacent: ['Central Illinois'],
      nonAdjacent: ['Chicago Metro', 'Northern Illinois']
    }
  },
  
  MO: {
    'Kansas City Metro': {
      default: 'Kansas City Metro',
      adjacent: ['Central Missouri'],
      nonAdjacent: ['St. Louis Metro', 'Springfield Area']
    },
    'St. Louis Metro': {
      default: 'St. Louis Metro',
      adjacent: ['Central Missouri'],
      nonAdjacent: ['Kansas City Metro', 'Springfield Area']
    },
    'Springfield Area': {
      default: 'Springfield Area',
      adjacent: ['Central Missouri'],
      nonAdjacent: ['Kansas City Metro', 'St. Louis Metro']
    },
    'Central Missouri': {
      default: 'Central Missouri',
      adjacent: ['Kansas City Metro', 'St. Louis Metro', 'Springfield Area'],
      nonAdjacent: []
    }
  },
  
  VA: {
    'Northern Virginia': {
      default: 'Northern Virginia',
      adjacent: ['Richmond Area'],
      nonAdjacent: ['Hampton Roads', 'Southwest Virginia']
    },
    'Richmond Area': {
      default: 'Richmond Area',
      adjacent: ['Northern Virginia', 'Hampton Roads', 'Southwest Virginia'],
      nonAdjacent: []
    },
    'Hampton Roads': {
      default: 'Hampton Roads',
      adjacent: ['Richmond Area'],
      nonAdjacent: ['Northern Virginia', 'Southwest Virginia']
    },
    'Southwest Virginia': {
      default: 'Southwest Virginia',
      adjacent: ['Richmond Area'],
      nonAdjacent: ['Northern Virginia', 'Hampton Roads']
    }
  },
  
  GA: {
    'Atlanta Metro': {
      default: 'Atlanta Metro',
      adjacent: ['North Georgia', 'Augusta Area', 'Columbus Area'],
      nonAdjacent: ['Savannah Area']
    },
    'North Georgia': {
      default: 'North Georgia',
      adjacent: ['Atlanta Metro'],
      nonAdjacent: ['Savannah Area', 'Augusta Area', 'Columbus Area']
    },
    'Savannah Area': {
      default: 'Savannah Area',
      adjacent: ['Augusta Area'],
      nonAdjacent: ['Atlanta Metro', 'North Georgia', 'Columbus Area']
    },
    'Augusta Area': {
      default: 'Augusta Area',
      adjacent: ['Atlanta Metro', 'Savannah Area'],
      nonAdjacent: ['North Georgia', 'Columbus Area']
    },
    'Columbus Area': {
      default: 'Columbus Area',
      adjacent: ['Atlanta Metro'],
      nonAdjacent: ['North Georgia', 'Savannah Area', 'Augusta Area']
    }
  },
  
  NC: {
    'Charlotte Metro': {
      default: 'Charlotte Metro',
      adjacent: ['Greensboro Area', 'Western NC'],
      nonAdjacent: ['Raleigh-Durham-Chapel Hill', 'Coastal']
    },
    'Raleigh-Durham-Chapel Hill': {
      default: 'Raleigh-Durham-Chapel Hill',
      adjacent: ['Greensboro Area', 'Coastal'],
      nonAdjacent: ['Charlotte Metro', 'Western NC']
    },
    'Greensboro Area': {
      default: 'Greensboro Area',
      adjacent: ['Charlotte Metro', 'Raleigh-Durham-Chapel Hill', 'Western NC'],
      nonAdjacent: ['Coastal']
    },
    'Coastal': {
      default: 'Coastal',
      adjacent: ['Raleigh-Durham-Chapel Hill'],
      nonAdjacent: ['Charlotte Metro', 'Greensboro Area', 'Western NC']
    },
    'Western NC': {
      default: 'Western NC',
      adjacent: ['Charlotte Metro', 'Greensboro Area'],
      nonAdjacent: ['Raleigh-Durham-Chapel Hill', 'Coastal']
    }
  },
  
  NY: {
    'New York City': {
      default: 'New York City',
      adjacent: ['Long Island', 'Hudson Valley'],
      nonAdjacent: ['Buffalo Area', 'Rochester-Syracuse']
    },
    'Long Island': {
      default: 'Long Island',
      adjacent: ['New York City'],
      nonAdjacent: ['Hudson Valley', 'Buffalo Area', 'Rochester-Syracuse']
    },
    'Hudson Valley': {
      default: 'Hudson Valley',
      adjacent: ['New York City', 'Rochester-Syracuse'],
      nonAdjacent: ['Long Island', 'Buffalo Area']
    },
    'Buffalo Area': {
      default: 'Buffalo Area',
      adjacent: ['Rochester-Syracuse'],
      nonAdjacent: ['New York City', 'Long Island', 'Hudson Valley']
    },
    'Rochester-Syracuse': {
      default: 'Rochester-Syracuse',
      adjacent: ['Hudson Valley', 'Buffalo Area'],
      nonAdjacent: ['New York City', 'Long Island']
    }
  },
  
  CO: {
    'Denver Metro': {
      default: 'Denver Metro',
      adjacent: ['Front Range', 'Western Colorado'],
      nonAdjacent: ['Southern Colorado']
    },
    'Front Range': {
      default: 'Front Range',
      adjacent: ['Denver Metro', 'Western Colorado'],
      nonAdjacent: ['Southern Colorado']
    },
    'Western Colorado': {
      default: 'Western Colorado',
      adjacent: ['Denver Metro', 'Front Range', 'Southern Colorado'],
      nonAdjacent: []
    },
    'Southern Colorado': {
      default: 'Southern Colorado',
      adjacent: ['Denver Metro', 'Western Colorado'],
      nonAdjacent: ['Front Range']
    }
  },
  
  WA: {
    'Seattle Metro': {
      default: 'Seattle Metro',
      adjacent: ['Tacoma Area', 'Central Washington'],
      nonAdjacent: ['Vancouver Area', 'Spokane Area']
    },
    'Tacoma Area': {
      default: 'Tacoma Area',
      adjacent: ['Seattle Metro', 'Vancouver Area'],
      nonAdjacent: ['Central Washington', 'Spokane Area']
    },
    'Vancouver Area': {
      default: 'Vancouver Area',
      adjacent: ['Tacoma Area'],
      nonAdjacent: ['Seattle Metro', 'Central Washington', 'Spokane Area']
    },
    'Spokane Area': {
      default: 'Spokane Area',
      adjacent: ['Central Washington'],
      nonAdjacent: ['Seattle Metro', 'Tacoma Area', 'Vancouver Area']
    },
    'Central Washington': {
      default: 'Central Washington',
      adjacent: ['Seattle Metro', 'Spokane Area'],
      nonAdjacent: ['Tacoma Area', 'Vancouver Area']
    }
  },
  
  LA: {
    'New Orleans Metro': {
      default: 'New Orleans Metro',
      adjacent: ['Baton Rouge Area', 'Acadiana'],
      nonAdjacent: ['Shreveport-Bossier']
    },
    'Baton Rouge Area': {
      default: 'Baton Rouge Area',
      adjacent: ['New Orleans Metro', 'Acadiana'],
      nonAdjacent: ['Shreveport-Bossier']
    },
    'Shreveport-Bossier': {
      default: 'Shreveport-Bossier',
      adjacent: [],
      nonAdjacent: ['New Orleans Metro', 'Baton Rouge Area', 'Acadiana']
    },
    'Acadiana': {
      default: 'Acadiana',
      adjacent: ['New Orleans Metro', 'Baton Rouge Area'],
      nonAdjacent: ['Shreveport-Bossier']
    }
  }
};

export function getRegionsForState(stateCode: string): StateRegions | null {
  return STATE_REGIONS[stateCode.toUpperCase()] || null;
}

export function getAdjacencyForState(stateCode: string): StateAdjacencyMap | null {
  return REGION_ADJACENCY[stateCode.toUpperCase()] || null;
}

export function getAllStatesWithRegions(): string[] {
  return Object.keys(STATE_REGIONS);
}

export function findRegionByZip(zip: string): { state: string; region: string } | null {
  const prefix = zip.substring(0, 3);
  
  for (const [state, regions] of Object.entries(STATE_REGIONS)) {
    for (const [region, data] of Object.entries(regions)) {
      if (data.zipPrefixes.includes(prefix)) {
        return { state, region };
      }
    }
  }
  
  return null;
}

export function getRegionAllocationByPlan(
  stateCode: string,
  homeRegion: string,
  planType: 'standard' | 'premium' | 'build_your_own'
): {
  homeRegion: string;
  includedAdjacent: string[];
  includedNonAdjacent: string[];
  selectableAdjacent: string[];
  selectableNonAdjacent: string[];
  totalRegions: number;
} {
  const adjacencyData = REGION_ADJACENCY[stateCode]?.[homeRegion];
  
  if (!adjacencyData) {
    return {
      homeRegion,
      includedAdjacent: [],
      includedNonAdjacent: [],
      selectableAdjacent: [],
      selectableNonAdjacent: [],
      totalRegions: 1
    };
  }
  
  if (planType === 'standard') {
    return {
      homeRegion,
      includedAdjacent: adjacencyData.adjacent.slice(0, 2),
      includedNonAdjacent: [],
      selectableAdjacent: [],
      selectableNonAdjacent: adjacencyData.nonAdjacent.slice(0, 1),
      totalRegions: 4
    };
  }
  
  if (planType === 'premium') {
    return {
      homeRegion,
      includedAdjacent: adjacencyData.adjacent.slice(0, 4),
      includedNonAdjacent: [],
      selectableAdjacent: [],
      selectableNonAdjacent: adjacencyData.nonAdjacent.slice(0, 4),
      totalRegions: 9
    };
  }
  
  return {
    homeRegion,
    includedAdjacent: [],
    includedNonAdjacent: [],
    selectableAdjacent: adjacencyData.adjacent,
    selectableNonAdjacent: adjacencyData.nonAdjacent,
    totalRegions: 0
  };
}
