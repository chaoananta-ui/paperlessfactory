export const SHIFT_ROWS = [
  { key: 'machineOperatorName', label: 'Machine operator Name :', uom: '', section: 'other' },
  { key: 'productionTarget', label: 'Production Target', uom: 'Case', section: 'production' },
  { key: 'actualProductionCase', label: 'Actual Production', uom: 'Case', section: 'production' },
  { key: 'actualProductionKg', label: 'Actual Production', uom: 'Kg', section: 'production' },
  { key: 'laminatePrintingWastage', label: 'Laminate / Can Printing wastage', uom: 'Kg', section: 'wastage' },
  { key: 'laminateQAWastage', label: 'Laminate QA wastage', uom: 'Kg', section: 'wastage' },
  { key: 'laminateMachineWastage', label: 'Laminate / Can Machine wastage', uom: 'Kg', section: 'wastage' },
  { key: 'laminateConsumptionBOM', label: 'Laminate / Can consumption (BOM)', uom: 'Kg', section: 'consumption' },
  { key: 'laminateOLR', label: 'Laminate / Can OLR', uom: 'Kg', section: 'consumption' },
  { key: 'totalLaminateWastageKg', label: 'Total Laminate / Can wastage', uom: 'Kg', section: 'consumption' },
  { key: 'totalLaminateWastagePct', label: 'Total Laminate / Can wastage', uom: '%', section: 'consumption' },
  { key: 'reworkMasala', label: 'Rework Masala Generation', uom: 'Kg', section: 'other' },
  { key: 'schemeDetail', label: 'Scheme Detail', uom: '', section: 'other' },
  { key: 'vacuumMasala', label: 'Vacuum Masala', uom: 'Kg', section: 'other' },
  { key: 'dustCollector', label: 'Dust Collector', uom: 'Kg', section: 'other' },
  { key: 'icWastage', label: 'IC Wastage', uom: 'No', section: 'other' },
  { key: 'masterCartonWastage', label: 'Master Carton wastage', uom: 'No', section: 'other' },
  { key: 'stdWorkers', label: 'Standard workers( Including Comp,FTC and Contractual)', uom: 'Manday', section: 'manpower' },
  { key: 'actualStdWorkers', label: 'Actual Standard workers ( Including Comp,FTC and Contractual)', uom: 'Manday', section: 'manpower' },
  { key: 'breakdown', label: 'Breakdown Details', uom: 'Min', section: 'breakdown_dynamic' },
];

export const MACHINES_BY_LOCATION = {
  'SHED NO 1': ['MACHINE 1', 'MACHINE 2', 'MACHINE 3', 'MACHINE 4'],
  'SHED NO 2': ['MACHINE 5', 'MACHINE 6', 'MACHINE 7', 'MACHINE 8'],
  'SHED NO 3': ['MACHINE 9', 'MACHINE 10'],
};
