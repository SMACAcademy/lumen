import type { Concept } from "@ise/concept-schema";
import type { Level, World } from "@ise/game-engine";
import { secantToTangent } from "./mathematics/calculus/secant-to-tangent";
import { sinusoidalFunctions } from "./mathematics/functions/sinusoidal-functions";
import { unitCircleSineCosine } from "./mathematics/trigonometry/unit-circle-sine-cosine";
import { vectorComponents } from "./mathematics/vectors/vector-components";
import { gravitation } from "./physics/gravitation/gravitation";
import { thermalProperties } from "./physics/matter/thermal-properties";
import { propertiesOfFluids } from "./physics/matter/properties-of-fluids";
import { propertiesOfSolids } from "./physics/matter/properties-of-solids";
import { motionInAStraightLine } from "./physics/kinematics/motion-in-a-straight-line";
import { lawsOfMotion } from "./physics/dynamics/laws-of-motion";
import { momentumCollisions } from "./physics/dynamics/momentum-collisions";
import { rotationalMotion } from "./physics/dynamics/rotational-motion";
import { workEnergy } from "./physics/dynamics/work-energy";
import { projectileMotion } from "./physics/kinematics/projectile-motion";
import { vernierCalliper } from "./physics/measurement/vernier-calliper";
import { shadowOfADot } from "./worlds/circles-and-waves/shadow-of-a-dot";
import { circlesAndWaves } from "./worlds/circles-and-waves/world";
import { distanceAndDisplacement } from "./worlds/motion/distance-and-displacement";
import { firedFromACliff } from "./worlds/motion/fired-from-a-cliff";
import { readingMotionGraphs } from "./worlds/motion/reading-motion-graphs";
import { twoMotionsAtOnce } from "./worlds/motion/two-motions-at-once";
import { motionWorld } from "./worlds/motion/world";
import { readTheCalliper } from "./worlds/measure/read-the-calliper";
import { theBentCalliper } from "./worlds/measure/the-bent-calliper";
import { measureWorld } from "./worlds/measure/world";
import { bounceAndRebound } from "./worlds/forces/bounce-and-rebound";
import { frictionTakesItsCut } from "./worlds/forces/friction-takes-its-cut";
import { whatSurvivesACrash } from "./worlds/forces/what-survives-a-crash";
import { theTurningEffect } from "./worlds/spin/the-turning-effect";
import { whereTheMassSits } from "./worlds/spin/where-the-mass-sits";
import { spinWorld } from "./worlds/spin/world";
import { theEnergyLedger } from "./worlds/forces/the-energy-ledger";
import { theTiltedTable } from "./worlds/forces/the-tilted-table";
import { whenFrictionGivesWay } from "./worlds/forces/when-friction-gives-way";
import { forcesWorld } from "./worlds/forces/world";
import { newtonsCannonball } from "./worlds/sky/newtons-cannonball";
import { theLongWayRound } from "./worlds/sky/the-long-way-round";
import { skyWorld } from "./worlds/sky/world";
import { theWireThatStretches } from "./worlds/matter/the-wire-that-stretches";
import { whereItGivesWay } from "./worlds/matter/where-it-gives-way";
import { howDeepIsDeep } from "./worlds/matter/how-deep-is-deep";
import { whatFloats } from "./worlds/matter/what-floats";
import { matterWorld } from "./worlds/matter/world";
import { theStubbornThermometer } from "./worlds/heat/the-stubborn-thermometer";
import { whereTheHeatHides } from "./worlds/heat/where-the-heat-hides";
import { heatWorld } from "./worlds/heat/world";
import { hydrogenSpectrum } from "./chemistry/atoms/hydrogen-spectrum";
import { reactionRates } from "./chemistry/kinetics/reaction-rates";
import { theRedLine } from "./worlds/atoms-and-light/the-red-line";
import { seriesAndLimits } from "./worlds/atoms-and-light/series-and-limits";
import { atomsAndLightWorld } from "./worlds/atoms-and-light/world";
import { halfAndHalfAgain } from "./worlds/rates/half-and-half-again";
import { tenDegreesHotter } from "./worlds/rates/ten-degrees-hotter";
import { ratesWorld } from "./worlds/rates/world";
import { chemicalEquilibrium } from "./chemistry/equilibrium/chemical-equilibrium";
import { acidsAndBases } from "./chemistry/equilibrium/acids-and-bases";
import { pushAndItPushesBack } from "./worlds/balance/push-and-it-pushes-back";
import { theHaberCompromise } from "./worlds/balance/the-haber-compromise";
import { balanceWorld } from "./worlds/balance/world";
import { oneDrop } from "./worlds/acids/one-drop";
import { weakAcidsAndBuffers } from "./worlds/acids/weak-acids-and-buffers";
import { acidsWorld } from "./worlds/acids/world";
import { galvanicCells } from "./chemistry/electrochemistry/galvanic-cells";
import { colligativeProperties } from "./chemistry/solutions/colligative-properties";
import { theDaniellCell } from "./worlds/batteries/the-daniell-cell";
import { whyBatteriesGoFlat } from "./worlds/batteries/why-batteries-go-flat";
import { batteriesWorld } from "./worlds/batteries/world";
import { saltOnTheRoad } from "./worlds/solutions/salt-on-the-road";
import { pastaWaterAndPairs } from "./worlds/solutions/pasta-water-and-pairs";
import { solutionsWorld } from "./worlds/solutions/world";
import { molesAndReactions } from "./chemistry/basics/moles-and-reactions";
import { gibbsEnergy } from "./chemistry/thermodynamics/gibbs-energy";
import { countingByWeighing } from "./worlds/moles/counting-by-weighing";
import { theLimitingReagent } from "./worlds/moles/the-limiting-reagent";
import { molesWorld } from "./worlds/moles/world";
import { whyIceMelts } from "./worlds/will-it-go/why-ice-melts";
import { fourKindsOfReaction } from "./worlds/will-it-go/four-kinds-of-reaction";
import { willItGoWorld } from "./worlds/will-it-go/world";
import { molecularShapes } from "./chemistry/bonding/molecular-shapes";
import { periodicTrends } from "./chemistry/periodicity/periodic-trends";
import { pairsPushApart } from "./worlds/shapes/pairs-push-apart";
import { beyondEight } from "./worlds/shapes/beyond-eight";
import { shapesWorld } from "./worlds/shapes/world";
import { acrossAndDown } from "./worlds/periodic-table/across-and-down";
import { theExceptions } from "./worlds/periodic-table/the-exceptions";
import { periodicTableWorld } from "./worlds/periodic-table/world";
import { ionsAndOres } from "./chemistry/basics/ions-and-ores";
import { givingElectrons } from "./worlds/ions-and-ores/giving-electrons";
import { outOfTheOre } from "./worlds/ions-and-ores/out-of-the-ore";
import { mixingMetals } from "./worlds/ions-and-ores/mixing-metals";
import { ionsAndOresWorld } from "./worlds/ions-and-ores/world";
import { combustionAndFuels } from "./chemistry/basics/combustion-and-fuels";
import { whatBurningNeeds } from "./worlds/combustion-and-fuels/what-burning-needs";
import { flamesAndFires } from "./worlds/combustion-and-fuels/flames-and-fires";
import { fuelsCoalAndPetroleum } from "./worlds/combustion-and-fuels/fuels-coal-and-petroleum";
import { combustionAndFuelsWorld } from "./worlds/combustion-and-fuels/world";
import { pureAndMixed } from "./chemistry/basics/pure-and-mixed";
import { oneKindOrMany } from "./worlds/pure-and-mixed/one-kind-or-many";
import { makingSolutions } from "./worlds/pure-and-mixed/making-solutions";
import { lightThroughLiquids } from "./worlds/pure-and-mixed/light-through-liquids";
import { pureAndMixedWorld } from "./worlds/pure-and-mixed/world";
import { fibresAndPlastics } from "./chemistry/organic/fibres-and-plastics";
import { chainsAndThreads } from "./worlds/fibres-and-plastics/chains-and-threads";
import { softenOrSet } from "./worlds/fibres-and-plastics/soften-or-set";
import { rotOrRemain } from "./worlds/fibres-and-plastics/rot-or-remain";
import { fibresAndPlasticsWorld } from "./worlds/fibres-and-plastics/world";
import { airAndWindLab } from "./physics/matter/air-and-wind";
import { airPressesAllRound } from "./worlds/air-and-wind/air-presses-all-round";
import { fastAirLowPressure } from "./worlds/air-and-wind/fast-air-low-pressure";
import { windsAndCyclones } from "./worlds/air-and-wind/winds-and-cyclones";
import { airAndWindWorld } from "./worlds/air-and-wind/world";
import { symmetryAndSolids } from "./mathematics/geometry/symmetry-and-solids";
import { foldAndTurn } from "./worlds/symmetry-and-solids/fold-and-turn";
import { polygonCorners } from "./worlds/symmetry-and-solids/polygon-corners";
import { facesNetsAndViews } from "./worlds/symmetry-and-solids/faces-nets-and-views";
import { symmetryAndSolidsWorld } from "./worlds/symmetry-and-solids/world";
import { inequalitiesAndOptimisation } from "./mathematics/algebra/inequalities-and-optimisation";
import { signsAndNumberLines } from "./worlds/inequalities-and-optimisation/signs-and-number-lines";
import { halfPlanesAndRegions } from "./worlds/inequalities-and-optimisation/half-planes-and-regions";
import { theBestCorner } from "./worlds/inequalities-and-optimisation/the-best-corner";
import { inequalitiesAndOptimisationWorld } from "./worlds/inequalities-and-optimisation/world";
import { identitiesAndPolynomials } from "./mathematics/algebra/identities-and-polynomials";
import { squaresOfTiles } from "./worlds/identities-and-polynomials/squares-of-tiles";
import { tilesIntoRectangles } from "./worlds/identities-and-polynomials/tiles-into-rectangles";
import { zeroesAndRemainders } from "./worlds/identities-and-polynomials/zeroes-and-remainders";
import { identitiesAndPolynomialsWorld } from "./worlds/identities-and-polynomials/world";
import { bigNumbersAndProportion } from "./mathematics/numbers/big-numbers-and-proportion";
import { lakhsAndMillions } from "./worlds/big-numbers-and-proportion/lakhs-and-millions";
import { roundAndRoman } from "./worlds/big-numbers-and-proportion/round-and-roman";
import { doubleOrHalve } from "./worlds/big-numbers-and-proportion/double-or-halve";
import { bigNumbersAndProportionWorld } from "./worlds/big-numbers-and-proportion/world";
import { tangentsAndSectors } from "./mathematics/geometry/tangents-and-sectors";
import { touchingACircle } from "./worlds/tangents-and-sectors/touching-a-circle";
import { slicesOfACircle } from "./worlds/tangents-and-sectors/slices-of-a-circle";
import { sectionAndHeron } from "./worlds/tangents-and-sectors/section-and-heron";
import { tangentsAndSectorsWorld } from "./worlds/tangents-and-sectors/world";
import { mirrorsAndImagesLab } from "./physics/light/mirrors-and-images";
import { smoothAndRough } from "./worlds/mirrors-and-images/smooth-and-rough";
import { mirrorsAtAnAngle } from "./worlds/mirrors-and-images/mirrors-at-an-angle";
import { upPeriscope } from "./worlds/mirrors-and-images/up-periscope";
import { mirrorsAndImagesWorld } from "./worlds/mirrors-and-images/world";
import { currentAndChemistry } from "./physics/electricity/current-and-chemistry";
import { liquidsThatConduct } from "./worlds/current-and-chemistry/liquids-that-conduct";
import { bubblesAndDeposits } from "./worlds/current-and-chemistry/bubbles-and-deposits";
import { aCopperCoat } from "./worlds/current-and-chemistry/a-copper-coat";
import { currentAndChemistryWorld } from "./worlds/current-and-chemistry/world";
import { chargesAndLightning } from "./physics/electrostatics/charges-and-lightning";
import { rubAndAttract } from "./worlds/charges-and-lightning/rub-and-attract";
import { foilElectroscope } from "./worlds/charges-and-lightning/foil-electroscope";
import { thunderAndLightning } from "./worlds/charges-and-lightning/thunder-and-lightning";
import { chargesAndLightningWorld } from "./worlds/charges-and-lightning/world";
import { radiansAndWaves } from "./worlds/circles-and-waves/radians-and-waves";
import { dialsOfAWave } from "./worlds/waves-on-a-graph/dials-of-a-wave";
import { shiftAndStretch } from "./worlds/waves-on-a-graph/shift-and-stretch";
import { riseOverRun } from "./worlds/the-derivative/rise-over-run";
import { wavesOnAGraph } from "./worlds/waves-on-a-graph/world";
import { formsOfALine } from "./worlds/lines-and-circles/forms-of-a-line";
import { isotopesAndIsobars } from "./worlds/inside-the-atom/isotopes-and-isobars";
import { haloalkanes } from "./chemistry/organic/haloalkanes";
import { carbonHalogenBond } from "./worlds/haloalkanes/carbon-halogen-bond";
import { sn1AndSn2 } from "./worlds/haloalkanes/sn1-and-sn2";
import { mirrorImageMolecules } from "./worlds/haloalkanes/mirror-image-molecules";
import { whenSubstitutionLoses } from "./worlds/haloalkanes/when-substitution-loses";
import { haloalkanesWorld } from "./worlds/haloalkanes/world";
import { oxygenCompounds } from "./chemistry/organic/oxygen-compounds";
import { alcoholsByDegree } from "./worlds/oxygen-compounds/alcohols-by-degree";
import { phenolsAndEthers } from "./worlds/oxygen-compounds/phenols-and-ethers";
import { theCarbonylAttacked } from "./worlds/oxygen-compounds/the-carbonyl-attacked";
import { mirrorsAndAcids } from "./worlds/oxygen-compounds/mirrors-and-acids";
import { oxygenCompoundsWorld } from "./worlds/oxygen-compounds/world";
import { hydrocarbons } from "./chemistry/organic/hydrocarbons";
import { turningEthane } from "./worlds/hydrocarbons/turning-ethane";
import { addingAcrossDoubleBonds } from "./worlds/hydrocarbons/adding-across-double-bonds";
import { tripleBondsAndRings } from "./worlds/hydrocarbons/triple-bonds-and-rings";
import { attackingTheRing } from "./worlds/hydrocarbons/attacking-the-ring";
import { hydrocarbonsWorld } from "./worlds/hydrocarbons/world";
import { aminesAndBiomolecules } from "./chemistry/organic/amines-and-biomolecules";
import { howBasicIsAnAmine } from "./worlds/amines-and-biomolecules/how-basic-is-an-amine";
import { fromNitroToAzoDyes } from "./worlds/amines-and-biomolecules/from-nitro-to-azo-dyes";
import { sugarsAndStarches } from "./worlds/amines-and-biomolecules/sugars-and-starches";
import { proteinsVitaminsAndDna } from "./worlds/amines-and-biomolecules/proteins-vitamins-and-dna";
import { aminesAndBiomoleculesWorld } from "./worlds/amines-and-biomolecules/world";
import { carbonCompounds } from "./chemistry/organic/carbon-compounds";
import { sharingElectrons } from "./worlds/carbon-compounds/sharing-electrons";
import { chainsAndFamilies } from "./worlds/carbon-compounds/chains-and-families";
import { burnChangeAndClean } from "./worlds/carbon-compounds/burn-change-and-clean";
import { carbonCompoundsWorld } from "./worlds/carbon-compounds/world";
import { tipToTail } from "./worlds/vector-components/tip-to-tail";
import { alongTheSlope } from "./worlds/vector-components/along-the-slope";
import { goingRound } from "./worlds/vector-components/going-round";
import { smallAngles } from "./worlds/angles-and-inverses/small-angles";
import { vectorComponentsWorld } from "./worlds/vector-components/world";
import { wholeNumbersAndDecimals } from "./worlds/fractions-on-a-line/whole-numbers-and-decimals";
import { areaOfACircle } from "./worlds/round-solids-and-similarity/area-of-a-circle";
import { netsAndSurfaceArea } from "./worlds/area-and-volume/nets-and-surface-area";
import { organicBasics } from "./chemistry/organic/organic-basics";
import { namingCarbonChains } from "./worlds/organic-basics/naming-carbon-chains";
import { sameFormulaNewMolecule } from "./worlds/organic-basics/same-formula-new-molecule";
import { pushingElectrons } from "./worlds/organic-basics/pushing-electrons";
import { breakingAndMakingBonds } from "./worlds/organic-basics/breaking-and-making-bonds";
import { organicBasicsWorld } from "./worlds/organic-basics/world";
import { practicalChemistry } from "./chemistry/practical/practical-chemistry";
import { buretteAndFlask } from "./worlds/practical-chemistry/burette-and-flask";
import { mysterySalt } from "./worlds/practical-chemistry/mystery-salt";
import { fusionAndTubeTests } from "./worlds/practical-chemistry/fusion-and-tube-tests";
import { practicalChemistryWorld } from "./worlds/practical-chemistry/world";
import { atomsAndTheTable } from "./chemistry/basics/atoms-and-the-table";
import { atomsToFormulae } from "./worlds/atoms-and-the-table/atoms-to-formulae";
import { countingInMoles } from "./worlds/atoms-and-the-table/counting-in-moles";
import { orderingTheElements } from "./worlds/atoms-and-the-table/ordering-the-elements";
import { atomsAndTheTableWorld } from "./worlds/atoms-and-the-table/world";
import { metalsAcidsSalts } from "./chemistry/basics/metals-acids-salts";
import { metalOrNonMetal } from "./worlds/metals-acids-salts/metal-or-non-metal";
import { whichMetalWins } from "./worlds/metals-acids-salts/which-metal-wins";
import { fizzPHAndSalts } from "./worlds/metals-acids-salts/fizz-ph-and-salts";
import { metalsAcidsSaltsWorld } from "./worlds/metals-acids-salts/world";
import { numbersAndPatterns } from "./mathematics/numbers/numbers-and-patterns";
import { primesAndRoots } from "./worlds/numbers-and-patterns/primes-and-roots";
import { growingPatterns } from "./worlds/numbers-and-patterns/growing-patterns";
import { parabolasAndProgressions } from "./worlds/numbers-and-patterns/parabolas-and-progressions";
import { numbersAndPatternsWorld } from "./worlds/numbers-and-patterns/world";
import { materialsAndParticles } from "./chemistry/basics/materials-and-particles";
import { sortAndDissolve } from "./worlds/materials-and-particles/sort-and-dissolve";
import { separateAndProtect } from "./worlds/materials-and-particles/separate-and-protect";
import { particlesOnTheMove } from "./worlds/materials-and-particles/particles-on-the-move";
import { materialsAndParticlesWorld } from "./worlds/materials-and-particles/world";
import { dataAndChance } from "./mathematics/probability/data-and-chance";
import { tallyMarksAndBars } from "./worlds/data-and-chance/tally-marks-and-bars";
import { howLikelyIsIt } from "./worlds/data-and-chance/how-likely-is-it";
import { favourableOverPossible } from "./worlds/data-and-chance/favourable-over-possible";
import { dataAndChanceWorld } from "./worlds/data-and-chance/world";
import { anglesAndShapes } from "./mathematics/geometry/angles-and-shapes";
import { measuringTurns } from "./worlds/angles-and-shapes/measuring-turns";
import { parallelLinesAndTriangles } from "./worlds/angles-and-shapes/parallel-lines-and-triangles";
import { congruenceAndParallelograms } from "./worlds/angles-and-shapes/congruence-and-parallelograms";
import { anglesInACircle } from "./worlds/angles-and-shapes/angles-in-a-circle";
import { anglesAndShapesWorld } from "./worlds/angles-and-shapes/world";
import { setsRelationsFunctions } from "./mathematics/algebra/sets-relations-functions";
import { setsAndRelations } from "./worlds/sets-relations-functions/sets-and-relations";
import { arrowsAndGraphs } from "./worlds/sets-relations-functions/arrows-and-graphs";
import { chainsAndInverses } from "./worlds/sets-relations-functions/chains-and-inverses";
import { setsRelationsFunctionsWorld } from "./worlds/sets-relations-functions/world";
import { ratiosAndPowers } from "./mathematics/numbers/ratios-and-powers";
import { shareItFairly } from "./worlds/ratios-and-powers/share-it-fairly";
import { outOfAHundred } from "./worlds/ratios-and-powers/out-of-a-hundred";
import { powersBigAndSmall } from "./worlds/ratios-and-powers/powers-big-and-small";
import { ratiosAndPowersWorld } from "./worlds/ratios-and-powers/world";
import { integersAndRationals } from "./mathematics/numbers/integers-and-rationals";
import { hopsBelowZero } from "./worlds/integers-and-rationals/hops-below-zero";
import { turningRoundTwice } from "./worlds/integers-and-rationals/turning-round-twice";
import { betweenAnyTwo } from "./worlds/integers-and-rationals/between-any-two";
import { integersAndRationalsWorld } from "./worlds/integers-and-rationals/world";
import { roundSolidsAndSimilarity } from "./mathematics/mensuration/round-solids-and-similarity";
import { wheelsAndTins } from "./worlds/round-solids-and-similarity/wheels-and-tins";
import { conesAndSpheres } from "./worlds/round-solids-and-similarity/cones-and-spheres";
import { sameShapeNewSize } from "./worlds/round-solids-and-similarity/same-shape-new-size";
import { roundSolidsAndSimilarityWorld } from "./worlds/round-solids-and-similarity/world";
import { linesAndCircles } from "./mathematics/algebra/lines-and-circles";
import { linesAtAnAngle } from "./worlds/lines-and-circles/lines-at-an-angle";
import { lineMeetsCircle } from "./worlds/lines-and-circles/line-meets-circle";
import { tangentsAndRadicalAxis } from "./worlds/lines-and-circles/tangents-and-radical-axis";
import { linesAndCirclesWorld } from "./worlds/lines-and-circles/world";
import { conicSections } from "./mathematics/coordinate-geometry/conic-sections";
import { slicingTheCone } from "./worlds/conic-sections/slicing-the-cone";
import { pinsAndString } from "./worlds/conic-sections/pins-and-string";
import { touchingTheCurve } from "./worlds/conic-sections/touching-the-curve";
import { conicSectionsWorld } from "./worlds/conic-sections/world";
import { anglesAndInverses } from "./mathematics/trigonometry/angles-and-inverses";
import { addingAngles } from "./worlds/angles-and-inverses/adding-angles";
import { everySolution } from "./worlds/angles-and-inverses/every-solution";
import { runningBackwards } from "./worlds/angles-and-inverses/running-backwards";
import { anglesAndInversesWorld } from "./worlds/angles-and-inverses/world";
import { workAndPower } from "./physics/dynamics/work-and-power";
import { pushAndLift } from "./worlds/work-and-power/push-and-lift";
import { wattsAndUnits } from "./worlds/work-and-power/watts-and-units";
import { workAndPowerWorld } from "./worlds/work-and-power/world";
import { solvingTriangles } from "./mathematics/trigonometry/solving-triangles";
import { sinesAndCosines } from "./worlds/solving-triangles/sines-and-cosines";
import { outOfReach } from "./worlds/solving-triangles/out-of-reach";
import { centresOfATriangle } from "./worlds/solving-triangles/centres-of-a-triangle";
import { solvingTrianglesWorld } from "./worlds/solving-triangles/world";
import { matricesAndDeterminants } from "./mathematics/algebra/matrices-and-determinants";
import { whereIAndJLand } from "./worlds/matrices-and-determinants/where-i-and-j-land";
import { theAreaScale } from "./worlds/matrices-and-determinants/the-area-scale";
import { undoingAMatrix } from "./worlds/matrices-and-determinants/undoing-a-matrix";
import { twoLinesOnePoint } from "./worlds/matrices-and-determinants/two-lines-one-point";
import { matricesAndDeterminantsWorld } from "./worlds/matrices-and-determinants/world";
import { statisticsLab } from "./mathematics/statistics/statistics";
import { middleOfTheMarks } from "./worlds/statistics/middle-of-the-marks";
import { howSpreadOut } from "./worlds/statistics/how-spread-out";
import { groupedIntoClasses } from "./worlds/statistics/grouped-into-classes";
import { statisticsWorld } from "./worlds/statistics/world";
import { vectorsInSpace } from "./mathematics/vectors/vectors-in-space";
import { pointsInSpace } from "./worlds/vectors-in-space/points-in-space";
import { shadowsAndAreas } from "./worlds/vectors-in-space/shadows-and-areas";
import { boxesAndPlanes } from "./worlds/vectors-in-space/boxes-and-planes";
import { linesThatMiss } from "./worlds/vectors-in-space/lines-that-miss";
import { vectorsInSpaceWorld } from "./worlds/vectors-in-space/world";
import { currentsAtWork } from "./physics/electricity/currents-at-work";
import { heatAndFuses } from "./worlds/currents-at-work/heat-and-fuses";
import { magnetsFromCurrent } from "./worlds/currents-at-work/magnets-from-current";
import { motorsAndGenerators } from "./worlds/currents-at-work/motors-and-generators";
import { currentsAtWorkWorld } from "./worlds/currents-at-work/world";
import { hotAndColdLab } from "./physics/matter/hot-and-cold";
import { feelItReadIt } from "./worlds/hot-and-cold/feel-it-read-it";
import { heatOnTheMove } from "./worlds/hot-and-cold/heat-on-the-move";
import { breezeByTheSea } from "./worlds/hot-and-cold/breeze-by-the-sea";
import { hotAndColdWorld } from "./worlds/hot-and-cold/world";
import { probabilityLab } from "./mathematics/probability/probability";
import { twoDice } from "./worlds/probability/two-dice";
import { givenThat } from "./worlds/probability/given-that";
import { testingPositive } from "./worlds/probability/testing-positive";
import { countingSuccesses } from "./worlds/probability/counting-successes";
import { probabilityWorld } from "./worlds/probability/world";
import { countingAndBinomial } from "./mathematics/algebra/counting-and-binomial";
import { multiplyTheChoices } from "./worlds/counting-and-binomial/multiply-the-choices";
import { chooseATeam } from "./worlds/counting-and-binomial/choose-a-team";
import { seatsAndNecklaces } from "./worlds/counting-and-binomial/seats-and-necklaces";
import { pascalsTriangle } from "./worlds/counting-and-binomial/pascals-triangle";
import { countingAndBinomialWorld } from "./worlds/counting-and-binomial/world";
import { complexNumbers } from "./mathematics/algebra/complex-numbers";
import { theArgandPlane } from "./worlds/complex-numbers/the-argand-plane";
import { turnAndStretch } from "./worlds/complex-numbers/turn-and-stretch";
import { theDiscriminant } from "./worlds/complex-numbers/the-discriminant";
import { whereTheRootsLie } from "./worlds/complex-numbers/where-the-roots-lie";
import { complexNumbersWorld } from "./worlds/complex-numbers/world";
import { sequencesAndSeries } from "./mathematics/algebra/sequences-and-series";
import { addingInPairs } from "./worlds/sequences-and-series/adding-in-pairs";
import { halvesForEver } from "./worlds/sequences-and-series/halves-for-ever";
import { meansAndBlocks } from "./worlds/sequences-and-series/means-and-blocks";
import { sequencesAndSeriesWorld } from "./worlds/sequences-and-series/world";
import { measuringAndMoving } from "./physics/measurement/measuring-and-moving";
import { spansAndScales } from "./worlds/measuring-and-moving/spans-and-scales";
import { readingARuler } from "./worlds/measuring-and-moving/reading-a-ruler";
import { swingsAndSpins } from "./worlds/measuring-and-moving/swings-and-spins";
import { measuringAndMovingWorld } from "./worlds/measuring-and-moving/world";
import { forcesPressureGravity } from "./physics/dynamics/forces-pressure-gravity";
import { pushAndRub } from "./worlds/forces-pressure-gravity/push-and-rub";
import { sharpAndWide } from "./worlds/forces-pressure-gravity/sharp-and-wide";
import { thePullOfGravity } from "./worlds/forces-pressure-gravity/the-pull-of-gravity";
import { forcesPressureGravityWorld } from "./worlds/forces-pressure-gravity/world";
import { centreOfMass } from "./physics/dynamics/centre-of-mass";
import { balanceAndBreakUp } from "./worlds/centre-of-mass/balance-and-break-up";
import { glancingBlowsAndRockets } from "./worlds/centre-of-mass/glancing-blows-and-rockets";
import { theAreaAndTheRate } from "./worlds/centre-of-mass/the-area-and-the-rate";
import { loopsAndHollows } from "./worlds/centre-of-mass/loops-and-hollows";
import { centreOfMassWorld } from "./worlds/centre-of-mass/world";
import { rollingAndEquilibrium } from "./physics/dynamics/rolling-and-equilibrium";
import { shiftingTheAxis } from "./worlds/rolling-and-equilibrium/shifting-the-axis";
import { theRollingRace } from "./worlds/rolling-and-equilibrium/the-rolling-race";
import { balancingAct } from "./worlds/rolling-and-equilibrium/balancing-act";
import { rollingAndEquilibriumWorld } from "./worlds/rolling-and-equilibrium/world";
import { fieldAndOrbits } from "./physics/gravitation/field-and-orbits";
import { howGChanges } from "./worlds/field-and-orbits/how-g-changes";
import { fallingTogether } from "./worlds/field-and-orbits/falling-together";
import { theCostOfClimbing } from "./worlds/field-and-orbits/the-cost-of-climbing";
import { fieldAndOrbitsWorld } from "./worlds/field-and-orbits/world";
import { elasticModuli } from "./physics/matter/elastic-moduli";
import { squeezeAndShear } from "./worlds/elastic-moduli/squeeze-and-shear";
import { thinnerAsItStretches } from "./worlds/elastic-moduli/thinner-as-it-stretches";
import { elasticModuliWorld } from "./worlds/elastic-moduli/world";
import { mirrorsEyeColoursLab } from "./physics/light/mirrors-eye-colours";
import { curvedMirrors } from "./worlds/mirrors-eye-colours/curved-mirrors";
import { seeingClearly } from "./worlds/mirrors-eye-colours/seeing-clearly";
import { rainbowAndSky } from "./worlds/mirrors-eye-colours/rainbow-and-sky";
import { mirrorsEyeColoursWorld } from "./worlds/mirrors-eye-colours/world";
import { relativeAndCircularMotion } from "./physics/kinematics/relative-and-circular-motion";
import { upAndDown } from "./worlds/relative-and-circular-motion/up-and-down";
import { alongTheRoad } from "./worlds/relative-and-circular-motion/along-the-road";
import { riversAndRain } from "./worlds/relative-and-circular-motion/rivers-and-rain";
import { circlesAndSlopes } from "./worlds/relative-and-circular-motion/circles-and-slopes";
import { relativeAndCircularMotionWorld } from "./worlds/relative-and-circular-motion/world";
import { connectedBodies } from "./physics/dynamics/connected-bodies";
import { pulledByAString } from "./worlds/connected-bodies/pulled-by-a-string";
import { liftsAndMovingFrames } from "./worlds/connected-bodies/lifts-and-moving-frames";
import { roundTheBend } from "./worlds/connected-bodies/round-the-bend";
import { connectedBodiesWorld } from "./worlds/connected-bodies/world";
import { heatTransfer } from "./physics/matter/heat-transfer";
import { stretchAndScale } from "./worlds/heat-transfer/stretch-and-scale";
import { downTheRod } from "./worlds/heat-transfer/down-the-rod";
import { glowAndCool } from "./worlds/heat-transfer/glow-and-cool";
import { heatTransferWorld } from "./worlds/heat-transfer/world";
import { semiconductors } from "./physics/modern/semiconductors";
import { bandsAndHoles } from "./worlds/semiconductors/bands-and-holes";
import { oneWayStreet } from "./worlds/semiconductors/one-way-street";
import { lightAndLogic } from "./worlds/semiconductors/light-and-logic";
import { semiconductorsWorld } from "./worlds/semiconductors/world";
import { unitsAndMeasurement } from "./physics/measurement/units-and-measurement";
import { buildingUnits } from "./worlds/units-and-measurement/building-units";
import { howManyFigures } from "./worlds/units-and-measurement/how-many-figures";
import { errorsAddUp } from "./worlds/units-and-measurement/errors-add-up";
import { unitsAndMeasurementWorld } from "./worlds/units-and-measurement/world";
import { rayOpticsLab } from "./physics/optics/ray-optics";
import { mirrorImages } from "./worlds/ray-optics/mirror-images";
import { lensImages } from "./worlds/ray-optics/lens-images";
import { trappedLight } from "./worlds/ray-optics/trapped-light";
import { lookingCloser } from "./worlds/ray-optics/looking-closer";
import { rayOpticsWorld } from "./worlds/ray-optics/world";
import { fluidsInMotion } from "./physics/matter/fluids-in-motion";
import { pushAndFlow } from "./worlds/fluids-in-motion/push-and-flow";
import { thickAndThin } from "./worlds/fluids-in-motion/thick-and-thin";
import { dropsAndTubes } from "./worlds/fluids-in-motion/drops-and-tubes";
import { fluidsInMotionWorld } from "./worlds/fluids-in-motion/world";
import { waveOptics } from "./physics/optics/wave-optics";
import { wavefrontsAndFringes } from "./worlds/wave-optics/wavefronts-and-fringes";
import { diffractionAndResolution } from "./worlds/wave-optics/diffraction-and-resolution";
import { polaroidsAndFilms } from "./worlds/wave-optics/polaroids-and-films";
import { waveOpticsWorld } from "./worlds/wave-optics/world";
import { nucleiLab } from "./physics/modern/nuclei";
import { tinyAndDense } from "./worlds/nuclei/tiny-and-dense";
import { towardsIron } from "./worlds/nuclei/towards-iron";
import { aHalfAtATime } from "./worlds/nuclei/a-half-at-a-time";
import { nucleiWorld } from "./worlds/nuclei/world";
import { photoelectricEffect } from "./physics/modern/photoelectric-effect";
import { lightOnAMetal } from "./worlds/photoelectric-effect/light-on-a-metal";
import { stoppingTheElectrons } from "./worlds/photoelectric-effect/stopping-the-electrons";
import { photonsAndElectronWaves } from "./worlds/photoelectric-effect/photons-and-electron-waves";
import { photoelectricEffectWorld } from "./worlds/photoelectric-effect/world";
import { alternatingCurrent } from "./physics/magnetism/alternating-current";
import { acPhaseAndRms } from "./worlds/alternating-current/ac-phase-and-rms";
import { acResonanceAndPower } from "./worlds/alternating-current/ac-resonance-and-power";
import { emWavesAndSpectrum } from "./worlds/alternating-current/em-waves-and-spectrum";
import { alternatingCurrentWorld } from "./worlds/alternating-current/world";
import { movingChargesAndMagnetism } from "./physics/magnetism/moving-charges-and-magnetism";
import { circlingCharges } from "./worlds/moving-charges/circling-charges";
import { pushesOnCurrents } from "./worlds/moving-charges/pushes-on-currents";
import { fieldsOfCurrents } from "./worlds/moving-charges/fields-of-currents";
import { movingChargesWorld } from "./worlds/moving-charges/world";
import { currentElectricity } from "./physics/electricity/current-electricity";
import { driftAndResistance } from "./worlds/current-electricity/drift-and-resistance";
import { cellsAndPower } from "./worlds/current-electricity/cells-and-power";
import { loopsAndBridges } from "./worlds/current-electricity/loops-and-bridges";
import { currentElectricityWorld } from "./worlds/current-electricity/world";
import { electromagneticInduction } from "./physics/magnetism/electromagnetic-induction";
import { changingFlux } from "./worlds/electromagnetic-induction/changing-flux";
import { rodsAndBrakes } from "./worlds/electromagnetic-induction/rods-and-brakes";
import { coilsAndGenerators } from "./worlds/electromagnetic-induction/coils-and-generators";
import { electromagneticInductionWorld } from "./worlds/electromagnetic-induction/world";
import { magnetismAndMatter } from "./physics/magnetism/magnetism-and-matter";
import { dipoleAndLines } from "./worlds/magnetism-and-matter/dipole-and-lines";
import { theEarthsField } from "./worlds/magnetism-and-matter/the-earths-field";
import { magneticMatter } from "./worlds/magnetism-and-matter/magnetic-matter";
import { magnetismAndMatterWorld } from "./worlds/magnetism-and-matter/world";
import { oscillations } from "./physics/oscillations/oscillations";
import { springsAndPendulums } from "./worlds/oscillations/springs-and-pendulums";
import { energyInShm } from "./worlds/oscillations/energy-in-shm";
import { dampedAndDriven } from "./worlds/oscillations/damped-and-driven";
import { oscillationsWorld } from "./worlds/oscillations/world";
import { wavesAndSound } from "./physics/waves/waves-and-sound";
import { travellingWaves } from "./worlds/waves/travelling-waves";
import { standingWaves } from "./worlds/waves/standing-waves";
import { beatsAndDoppler } from "./worlds/waves/beats-and-doppler";
import { wavesWorld } from "./worlds/waves/world";
import { potentialAndCapacitance } from "./physics/electrostatics/potential-and-capacitance";
import { hillsOfPotential } from "./worlds/potential-and-capacitance/hills-of-potential";
import { storingCharge } from "./worlds/potential-and-capacitance/storing-charge";
import { capacitorsTogether } from "./worlds/potential-and-capacitance/capacitors-together";
import { potentialAndCapacitanceWorld } from "./worlds/potential-and-capacitance/world";
import { differentialEquations } from "./mathematics/calculus/differential-equations";
import { followTheSlopes } from "./worlds/differential-equations/follow-the-slopes";
import { growthAndCooling } from "./worlds/differential-equations/growth-and-cooling";
import { solvingThem } from "./worlds/differential-equations/solving-them";
import { differentialEquationsWorld } from "./worlds/differential-equations/world";
import { electricChargesAndFields } from "./physics/electrostatics/electric-charges-and-fields";
import { chargesAndForces } from "./worlds/electric-fields/charges-and-forces";
import { fieldsAndDipoles } from "./worlds/electric-fields/fields-and-dipoles";
import { fluxAndGauss } from "./worlds/electric-fields/flux-and-gauss";
import { electricFieldsWorld } from "./worlds/electric-fields/world";
import { thermodynamicsLab } from "./physics/matter/thermodynamics";
import { firstLaw } from "./worlds/thermodynamics/first-law";
import { fourProcesses } from "./worlds/thermodynamics/four-processes";
import { enginesAndFridges } from "./worlds/thermodynamics/engines-and-fridges";
import { thermodynamicsWorld } from "./worlds/thermodynamics/world";
import { methodsOfIntegration } from "./mathematics/calculus/methods-of-integration";
import { changeOfVariable } from "./worlds/methods-of-integration/change-of-variable";
import { twoAreasOneRectangle } from "./worlds/methods-of-integration/two-areas-one-rectangle";
import { splittingFractions } from "./worlds/methods-of-integration/splitting-fractions";
import { methodsOfIntegrationWorld } from "./worlds/methods-of-integration/world";
import { areaByStrips } from "./mathematics/calculus/area-by-strips";
import { slicingItThin } from "./worlds/area-by-strips/slicing-it-thin";
import { signedArea } from "./worlds/area-by-strips/signed-area";
import { betweenTheCurves } from "./worlds/area-by-strips/between-the-curves";
import { areaByStripsWorld } from "./worlds/area-by-strips/world";
import { kineticTheory } from "./physics/matter/kinetic-theory";
import { moleculesInABox } from "./worlds/kinetic-theory/molecules-in-a-box";
import { howFastMoleculesMove } from "./worlds/kinetic-theory/how-fast-molecules-move";
import { heatCapacitiesOfGases } from "./worlds/kinetic-theory/heat-capacities-of-gases";
import { kineticTheoryWorld } from "./worlds/kinetic-theory/world";
import { fundamentalTheorem } from "./mathematics/calculus/fundamental-theorem";
import { sweepingTheArea } from "./worlds/area-so-far/sweeping-the-area";
import { undoingTheSlope } from "./worlds/area-so-far/undoing-the-slope";
import { distanceFromSpeed } from "./worlds/area-so-far/distance-from-speed";
import { areaSoFarWorld } from "./worlds/area-so-far/world";
import { optimisationAndRates } from "./mathematics/calculus/optimisation-and-rates";
import { theBestBox } from "./worlds/using-derivatives/the-best-box";
import { risingAndFalling } from "./worlds/using-derivatives/rising-and-falling";
import { tiedTogether } from "./worlds/using-derivatives/tied-together";
import { usingDerivativesWorld } from "./worlds/using-derivatives/world";
import { rulesOfDifferentiation } from "./mathematics/calculus/rules-of-differentiation";
import { theGrowingRectangle } from "./worlds/rules-of-differentiation/the-growing-rectangle";
import { linksInAChain } from "./worlds/rules-of-differentiation/links-in-a-chain";
import { roundTheCircle } from "./worlds/rules-of-differentiation/round-the-circle";
import { rulesOfDifferentiationWorld } from "./worlds/rules-of-differentiation/world";
import { slopeGraph } from "./mathematics/calculus/slope-graph";
import { closingTheGap } from "./worlds/the-derivative/closing-the-gap";
import { theSlopeGraph } from "./worlds/the-derivative/the-slope-graph";
import { bendingUpBendingDown } from "./worlds/the-derivative/bending-up-bending-down";
import { theDerivativeWorld } from "./worlds/the-derivative/world";
import { limitsAndContinuity } from "./mathematics/calculus/limits-and-continuity";
import { closingIn } from "./worlds/limits/closing-in";
import { breaksAndHoles } from "./worlds/limits/breaks-and-holes";
import { zoomingIn } from "./worlds/limits/zooming-in";
import { limitsWorld } from "./worlds/limits/world";
import { groupsAndValency } from "./worlds/periodic-table/groups-and-valency";
import { valenceBondTheory } from "./chemistry/bonding/valence-bond-theory";
import { overlappingOrbitals } from "./worlds/valence-bond/overlapping-orbitals";
import { sigmaAndPi } from "./worlds/valence-bond/sigma-and-pi";
import { valenceBondWorld } from "./worlds/valence-bond/world";
import { lanthanoidsAndActinoids } from "./chemistry/inorganic/lanthanoids-and-actinoids";
import { theLanthanoidContraction } from "./worlds/f-block/the-lanthanoid-contraction";
import { theActinoids } from "./worlds/f-block/the-actinoids";
import { fBlockWorld } from "./worlds/f-block/world";
import { halogensAndNobleGases } from "./chemistry/inorganic/halogens-and-noble-gases";
import { theHalogens } from "./worlds/halogens-and-noble-gases/the-halogens";
import { theNobleGases } from "./worlds/halogens-and-noble-gases/the-noble-gases";
import { halogensAndNobleGasesWorld } from "./worlds/halogens-and-noble-gases/world";
import { nucleusAndMatterWaves } from "./chemistry/atoms/nucleus-and-matter-waves";
import { findingTheNucleus } from "./worlds/quantum-atom/finding-the-nucleus";
import { matterWaves } from "./worlds/quantum-atom/matter-waves";
import { quantumAtomWorld } from "./worlds/quantum-atom/world";
import { solubilityProduct } from "./chemistry/equilibrium/solubility-product";
import { willItPrecipitate } from "./worlds/sparingly-soluble/will-it-precipitate";
import { theCommonIon } from "./worlds/sparingly-soluble/the-common-ion";
import { sparinglySolubleWorld } from "./worlds/sparingly-soluble/world";
import { formulaeAndConcentration } from "./chemistry/basics/formulae-and-concentration";
import { whatsInAFormula } from "./worlds/formulae/whats-in-a-formula";
import { howStrongIsIt } from "./worlds/formulae/how-strong-is-it";
import { formulaeWorld } from "./worlds/formulae/world";
import { rateLaws } from "./chemistry/kinetics/rate-laws";
import { findingTheOrder } from "./worlds/rate-laws/finding-the-order";
import { straightLinePlots } from "./worlds/rate-laws/straight-line-plots";
import { collisionsThatCount } from "./worlds/rate-laws/collisions-that-count";
import { rateLawsWorld } from "./worlds/rate-laws/world";
import { liquidMixtures } from "./chemistry/solutions/liquid-mixtures";
import { vapourOverMixtures } from "./worlds/mixtures/vapour-over-mixtures";
import { idealOrNot } from "./worlds/mixtures/ideal-or-not";
import { mixturesWorld } from "./worlds/mixtures/world";
import { enthalpyAndHess } from "./chemistry/thermodynamics/enthalpy-and-hess";
import { hotAndCold } from "./worlds/enthalpy/hot-and-cold";
import { hessCycles } from "./worlds/enthalpy/hess-cycles";
import { enthalpyWorld } from "./worlds/enthalpy/world";
import { lewisStructures } from "./chemistry/bonding/lewis-structures";
import { countingElectrons } from "./worlds/lewis/counting-electrons";
import { formalChargeAndResonance } from "./worlds/lewis/formal-charge-and-resonance";
import { lewisWorld } from "./worlds/lewis/world";
import { molecularOrbitals } from "./chemistry/bonding/molecular-orbitals";
import { fillingTheMos } from "./worlds/mo-theory/filling-the-mos";
import { whyOxygenIsMagnetic } from "./worlds/mo-theory/why-oxygen-is-magnetic";
import { moTheoryWorld } from "./worlds/mo-theory/world";
import { complexIsomers } from "./chemistry/inorganic/complex-isomers";
import { namingComplexes } from "./worlds/naming-and-isomers/naming-complexes";
import { cisTransAndMirrors } from "./worlds/naming-and-isomers/cis-trans-and-mirrors";
import { namingAndIsomersWorld } from "./worlds/naming-and-isomers/world";
import { pBlock } from "./chemistry/inorganic/p-block";
import { downTheGroup } from "./worlds/p-block/down-the-group";
import { theHydrides } from "./worlds/p-block/the-hydrides";
import { pBlockWorld } from "./worlds/p-block/world";
import { coordinationCompounds } from "./chemistry/inorganic/coordination-compounds";
import { splittingTheDOrbitals } from "./worlds/complexes/splitting-the-d-orbitals";
import { highSpinLowSpin } from "./worlds/complexes/high-spin-low-spin";
import { complexesWorld } from "./worlds/complexes/world";
import { transitionMetals } from "./chemistry/inorganic/transition-metals";
import { colourAndMagnetism } from "./worlds/d-block/colour-and-magnetism";
import { variableValency } from "./worlds/d-block/variable-valency";
import { dBlockWorld } from "./worlds/d-block/world";
import { batteriesAndCorrosion } from "./chemistry/electrochemistry/batteries-and-corrosion";
import { cellsAndEnergy } from "./worlds/batteries-and-rust/cells-and-energy";
import { stoppingRust } from "./worlds/batteries-and-rust/stopping-rust";
import { batteriesAndRustWorld } from "./worlds/batteries-and-rust/world";
import { redoxReactions } from "./chemistry/electrochemistry/redox-reactions";
import { oxidationNumbers } from "./worlds/redox/oxidation-numbers";
import { balanceTheElectrons } from "./worlds/redox/balance-the-electrons";
import { redoxWorld } from "./worlds/redox/world";
import { electrolysisAndConductance } from "./chemistry/electrochemistry/electrolysis-and-conductance";
import { faradaysLaws } from "./worlds/electrolysis/faradays-laws";
import { ionsOnTheMove } from "./worlds/electrolysis/ions-on-the-move";
import { electrolysisWorld } from "./worlds/electrolysis/world";
import { atomicOrbitals } from "./chemistry/atoms/atomic-orbitals";
import { fillingTheBoxes } from "./worlds/orbitals/filling-the-boxes";
import { shapesAndNodes } from "./worlds/orbitals/shapes-and-nodes";
import { orbitalsWorld } from "./worlds/orbitals/world";
import { linesAndGraphs } from "./mathematics/algebra/lines-and-graphs";
import { pointsAndLines } from "./worlds/lines-and-graphs/points-and-lines";
import { whereLinesMeet } from "./worlds/lines-and-graphs/where-lines-meet";
import { linesAndGraphsWorld } from "./worlds/lines-and-graphs/world";
import { rightTriangles } from "./mathematics/trigonometry/right-triangles";
import { squaresOnTheSides } from "./worlds/right-triangles/squares-on-the-sides";
import { sineCosineTangent } from "./worlds/right-triangles/sine-cosine-tangent";
import { rightTrianglesWorld } from "./worlds/right-triangles/world";
import { chemicalEquations } from "./chemistry/basics/chemical-equations";
import { atomsInAtomsOut } from "./worlds/balancing-equations/atoms-in-atoms-out";
import { balanceIt } from "./worlds/balancing-equations/balance-it";
import { balancingEquationsWorld } from "./worlds/balancing-equations/world";
import { soundAndEchoes } from "./physics/sound/sound-and-echoes";
import { makingWaves } from "./worlds/sound/making-waves";
import { echoes } from "./worlds/sound/echoes";
import { soundWorld } from "./worlds/sound/world";
import { structureOfTheAtom } from "./chemistry/atoms/structure-of-the-atom";
import { electronShells } from "./worlds/inside-the-atom/electron-shells";
import { theModernTable } from "./worlds/inside-the-atom/the-modern-table";
import { insideTheAtomWorld } from "./worlds/inside-the-atom/world";
import { currentAndResistance } from "./physics/electricity/current-and-resistance";
import { ohmsLaw } from "./worlds/current-and-resistance/ohms-law";
import { seriesOrParallel } from "./worlds/current-and-resistance/series-or-parallel";
import { currentAndResistanceWorld } from "./worlds/current-and-resistance/world";
import { bendingLight } from "./physics/light/bending-light";
import { intoTheWater } from "./worlds/bending-light/into-the-water";
import { throughALens } from "./worlds/bending-light/through-a-lens";
import { bendingLightWorld } from "./worlds/bending-light/world";
import { liftAndDrop } from "./worlds/work-and-energy/lift-and-drop";
import { energyChangesForm } from "./worlds/work-and-energy/energy-changes-form";
import { workAndEnergyWorld } from "./worlds/work-and-energy/world";
import { balancedAndUnbalanced } from "./worlds/force-and-momentum/balanced-and-unbalanced";
import { bumpsAndBounces } from "./worlds/force-and-momentum/bumps-and-bounces";
import { forceAndMomentumWorld } from "./worlds/force-and-momentum/world";
import { steadyOrSpeedingUp } from "./worlds/motion-graphs/steady-or-speeding-up";
import { areaUnderTheGraph } from "./worlds/motion-graphs/area-under-the-graph";
import { motionGraphsWorld } from "./worlds/motion-graphs/world";
import { areaAndVolume } from "./mathematics/mensuration/area-and-volume";
import { countingSquares } from "./worlds/area-and-volume/counting-squares";
import { fillingBoxes } from "./worlds/area-and-volume/filling-boxes";
import { areaAndVolumeWorld } from "./worlds/area-and-volume/world";
import { funWithMagnets } from "./physics/magnets/fun-with-magnets";
import { whatSticks } from "./worlds/magnets/what-sticks";
import { polesApart } from "./worlds/magnets/poles-apart";
import { magnetsWorld } from "./worlds/magnets/world";
import { balanceTheScale } from "./mathematics/algebra/balance-the-scale";
import { findTheMysteryWeight } from "./worlds/balance-the-scale/find-the-mystery-weight";
import { sameToBothSides } from "./worlds/balance-the-scale/same-to-both-sides";
import { balanceTheScaleWorld } from "./worlds/balance-the-scale/world";
import { lightAndShadows } from "./physics/light/light-and-shadows";
import { shadowPlay } from "./worlds/shadows-and-mirrors/shadow-play";
import { mirrorMirror } from "./worlds/shadows-and-mirrors/mirror-mirror";
import { shadowsAndMirrorsWorld } from "./worlds/shadows-and-mirrors/world";
import { meltBoilChangeBack } from "./worlds/changes-around-us/melt-boil-change-back";
import { canYouUndoIt } from "./worlds/changes-around-us/can-you-undo-it";
import { changesAroundUsWorld } from "./worlds/changes-around-us/world";
import { heavyIsNotTheQuestion } from "./worlds/float-or-sink/heavy-is-not-the-question";
import { thePushOfWater } from "./worlds/float-or-sink/the-push-of-water";
import { floatOrSinkWorld } from "./worlds/float-or-sink/world";
import { howFast } from "./worlds/fast-and-slow/how-fast";
import { theJourneyGraph } from "./worlds/fast-and-slow/the-journey-graph";
import { fastAndSlowWorld } from "./worlds/fast-and-slow/world";
import { sourBitterOrNeither } from "./worlds/sour-bitter-or-neither/sour-bitter-or-neither";
import { neutraliseIt } from "./worlds/sour-bitter-or-neither/neutralise-it";
import { sourBitterOrNeitherWorld } from "./worlds/sour-bitter-or-neither/world";
import { fractionsOnALine } from "./mathematics/numbers/fractions-on-a-line";
import { whereFractionsLive } from "./worlds/fractions-on-a-line/where-fractions-live";
import { samePointDifferentNames } from "./worlds/fractions-on-a-line/same-point-different-names";
import { fractionsOnALineWorld } from "./worlds/fractions-on-a-line/world";
import { simpleCircuits } from "./physics/electricity/simple-circuits";
import { closeTheLoop } from "./worlds/light-the-bulb/close-the-loop";
import { conductorOrInsulator } from "./worlds/light-the-bulb/conductor-or-insulator";
import { lightTheBulbWorld } from "./worlds/light-the-bulb/world";

/** Every authored concept, in learning order. Adding a concept = adding a definition here. */
export const concepts: readonly Concept[] = [
  unitCircleSineCosine,
  sinusoidalFunctions,
  vectorComponents,
  secantToTangent,
  motionInAStraightLine,
  projectileMotion,
  lawsOfMotion,
  workEnergy,
  momentumCollisions,
  rotationalMotion,
  gravitation,
  propertiesOfSolids,
  propertiesOfFluids,
  thermalProperties,
  vernierCalliper,
  hydrogenSpectrum,
  reactionRates,
  chemicalEquilibrium,
  acidsAndBases,
  galvanicCells,
  colligativeProperties,
  molesAndReactions,
  gibbsEnergy,
  molecularShapes,
  periodicTrends,
  simpleCircuits,
  fractionsOnALine,
  lightAndShadows,
  balanceTheScale,
  funWithMagnets,
  areaAndVolume,
  bendingLight,
  currentAndResistance,
  structureOfTheAtom,
  soundAndEchoes,
  chemicalEquations,
  rightTriangles,
  linesAndGraphs,
  atomicOrbitals,
  electrolysisAndConductance,
  redoxReactions,
  batteriesAndCorrosion,
  transitionMetals,
  coordinationCompounds,
  pBlock,
  complexIsomers,
  molecularOrbitals,
  lewisStructures,
  enthalpyAndHess,
  liquidMixtures,
  rateLaws,
  formulaeAndConcentration,
  solubilityProduct,
  nucleusAndMatterWaves,
  halogensAndNobleGases,
  lanthanoidsAndActinoids,
  valenceBondTheory,
  limitsAndContinuity,
  slopeGraph,
  rulesOfDifferentiation,
  optimisationAndRates,
  fundamentalTheorem,
  kineticTheory,
  areaByStrips,
  methodsOfIntegration,
  thermodynamicsLab,
  electricChargesAndFields,
  differentialEquations,
  potentialAndCapacitance,
  wavesAndSound,
  oscillations,
  magnetismAndMatter,
  electromagneticInduction,
  currentElectricity,
  movingChargesAndMagnetism,
  alternatingCurrent,
  photoelectricEffect,
  nucleiLab,
  waveOptics,
  fluidsInMotion,
  rayOpticsLab,
  unitsAndMeasurement,
  semiconductors,
  heatTransfer,
  connectedBodies,
  relativeAndCircularMotion,
  mirrorsEyeColoursLab,
  elasticModuli,
  fieldAndOrbits,
  rollingAndEquilibrium,
  centreOfMass,
  forcesPressureGravity,
  measuringAndMoving,
  sequencesAndSeries,
  complexNumbers,
  countingAndBinomial,
  probabilityLab,
  hotAndColdLab,
  currentsAtWork,
  vectorsInSpace,
  statisticsLab,
  matricesAndDeterminants,
  solvingTriangles,
  workAndPower,
  anglesAndInverses,
  conicSections,
  linesAndCircles,
  roundSolidsAndSimilarity,
  integersAndRationals,
  ratiosAndPowers,
  setsRelationsFunctions,
  anglesAndShapes,
  dataAndChance,
  materialsAndParticles,
  numbersAndPatterns,
  metalsAcidsSalts,
  atomsAndTheTable,
  practicalChemistry,
  organicBasics,
  carbonCompounds,
  aminesAndBiomolecules,
  hydrocarbons,
  oxygenCompounds,
  haloalkanes,
  chargesAndLightning,
  currentAndChemistry,
  mirrorsAndImagesLab,
  tangentsAndSectors,
  bigNumbersAndProportion,
  identitiesAndPolynomials,
  inequalitiesAndOptimisation,
  symmetryAndSolids,
  airAndWindLab,
  fibresAndPlastics,
  pureAndMixed,
  combustionAndFuels,
  ionsAndOres,
];

export function getConcept(id: string): Concept | undefined {
  return concepts.find((c) => c.meta.id === id);
}

/** Every playable level. A level is listed in exactly one world. */
export const levels: readonly Level[] = [
  shadowOfADot,
  readTheCalliper,
  theBentCalliper,
  distanceAndDisplacement,
  readingMotionGraphs,
  twoMotionsAtOnce,
  firedFromACliff,
  whenFrictionGivesWay,
  theTiltedTable,
  theEnergyLedger,
  frictionTakesItsCut,
  whatSurvivesACrash,
  bounceAndRebound,
  theTurningEffect,
  whereTheMassSits,
  newtonsCannonball,
  theLongWayRound,
  theWireThatStretches,
  whereItGivesWay,
  howDeepIsDeep,
  whatFloats,
  theStubbornThermometer,
  whereTheHeatHides,
  theRedLine,
  seriesAndLimits,
  halfAndHalfAgain,
  tenDegreesHotter,
  pushAndItPushesBack,
  theHaberCompromise,
  oneDrop,
  weakAcidsAndBuffers,
  theDaniellCell,
  whyBatteriesGoFlat,
  saltOnTheRoad,
  pastaWaterAndPairs,
  countingByWeighing,
  theLimitingReagent,
  whyIceMelts,
  fourKindsOfReaction,
  pairsPushApart,
  beyondEight,
  acrossAndDown,
  theExceptions,
  closeTheLoop,
  conductorOrInsulator,
  whereFractionsLive,
  samePointDifferentNames,
  sourBitterOrNeither,
  neutraliseIt,
  howFast,
  theJourneyGraph,
  heavyIsNotTheQuestion,
  thePushOfWater,
  meltBoilChangeBack,
  canYouUndoIt,
  shadowPlay,
  mirrorMirror,
  findTheMysteryWeight,
  sameToBothSides,
  whatSticks,
  polesApart,
  countingSquares,
  fillingBoxes,
  steadyOrSpeedingUp,
  areaUnderTheGraph,
  balancedAndUnbalanced,
  bumpsAndBounces,
  liftAndDrop,
  energyChangesForm,
  intoTheWater,
  throughALens,
  ohmsLaw,
  seriesOrParallel,
  electronShells,
  theModernTable,
  makingWaves,
  echoes,
  atomsInAtomsOut,
  balanceIt,
  squaresOnTheSides,
  sineCosineTangent,
  pointsAndLines,
  whereLinesMeet,
  fillingTheBoxes,
  shapesAndNodes,
  faradaysLaws,
  ionsOnTheMove,
  oxidationNumbers,
  balanceTheElectrons,
  cellsAndEnergy,
  stoppingRust,
  colourAndMagnetism,
  variableValency,
  splittingTheDOrbitals,
  highSpinLowSpin,
  downTheGroup,
  theHydrides,
  namingComplexes,
  cisTransAndMirrors,
  fillingTheMos,
  whyOxygenIsMagnetic,
  countingElectrons,
  formalChargeAndResonance,
  hotAndCold,
  hessCycles,
  vapourOverMixtures,
  idealOrNot,
  findingTheOrder,
  straightLinePlots,
  collisionsThatCount,
  whatsInAFormula,
  howStrongIsIt,
  willItPrecipitate,
  theCommonIon,
  findingTheNucleus,
  matterWaves,
  theHalogens,
  theNobleGases,
  theLanthanoidContraction,
  theActinoids,
  overlappingOrbitals,
  sigmaAndPi,
  groupsAndValency,
  closingIn,
  breaksAndHoles,
  zoomingIn,
  closingTheGap,
  theSlopeGraph,
  bendingUpBendingDown,
  theGrowingRectangle,
  linksInAChain,
  roundTheCircle,
  theBestBox,
  risingAndFalling,
  tiedTogether,
  sweepingTheArea,
  undoingTheSlope,
  distanceFromSpeed,
  moleculesInABox,
  howFastMoleculesMove,
  heatCapacitiesOfGases,
  slicingItThin,
  signedArea,
  betweenTheCurves,
  changeOfVariable,
  twoAreasOneRectangle,
  splittingFractions,
  firstLaw,
  fourProcesses,
  enginesAndFridges,
  chargesAndForces,
  fieldsAndDipoles,
  fluxAndGauss,
  followTheSlopes,
  growthAndCooling,
  solvingThem,
  hillsOfPotential,
  storingCharge,
  capacitorsTogether,
  travellingWaves,
  standingWaves,
  beatsAndDoppler,
  springsAndPendulums,
  energyInShm,
  dampedAndDriven,
  dipoleAndLines,
  theEarthsField,
  magneticMatter,
  changingFlux,
  rodsAndBrakes,
  coilsAndGenerators,
  driftAndResistance,
  cellsAndPower,
  loopsAndBridges,
  circlingCharges,
  pushesOnCurrents,
  fieldsOfCurrents,
  acPhaseAndRms,
  acResonanceAndPower,
  emWavesAndSpectrum,
  lightOnAMetal,
  stoppingTheElectrons,
  photonsAndElectronWaves,
  tinyAndDense,
  towardsIron,
  aHalfAtATime,
  wavefrontsAndFringes,
  diffractionAndResolution,
  polaroidsAndFilms,
  pushAndFlow,
  thickAndThin,
  dropsAndTubes,
  mirrorImages,
  lensImages,
  trappedLight,
  lookingCloser,
  buildingUnits,
  howManyFigures,
  errorsAddUp,
  bandsAndHoles,
  oneWayStreet,
  lightAndLogic,
  stretchAndScale,
  downTheRod,
  glowAndCool,
  pulledByAString,
  liftsAndMovingFrames,
  roundTheBend,
  upAndDown,
  alongTheRoad,
  riversAndRain,
  circlesAndSlopes,
  curvedMirrors,
  seeingClearly,
  rainbowAndSky,
  squeezeAndShear,
  thinnerAsItStretches,
  howGChanges,
  fallingTogether,
  theCostOfClimbing,
  shiftingTheAxis,
  theRollingRace,
  balancingAct,
  balanceAndBreakUp,
  glancingBlowsAndRockets,
  theAreaAndTheRate,
  loopsAndHollows,
  pushAndRub,
  sharpAndWide,
  thePullOfGravity,
  spansAndScales,
  readingARuler,
  swingsAndSpins,
  addingInPairs,
  halvesForEver,
  meansAndBlocks,
  theArgandPlane,
  turnAndStretch,
  theDiscriminant,
  whereTheRootsLie,
  multiplyTheChoices,
  chooseATeam,
  seatsAndNecklaces,
  pascalsTriangle,
  twoDice,
  givenThat,
  testingPositive,
  countingSuccesses,
  feelItReadIt,
  heatOnTheMove,
  breezeByTheSea,
  heatAndFuses,
  magnetsFromCurrent,
  motorsAndGenerators,
  pointsInSpace,
  shadowsAndAreas,
  boxesAndPlanes,
  linesThatMiss,
  middleOfTheMarks,
  howSpreadOut,
  groupedIntoClasses,
  whereIAndJLand,
  theAreaScale,
  undoingAMatrix,
  twoLinesOnePoint,
  sinesAndCosines,
  outOfReach,
  centresOfATriangle,
  pushAndLift,
  wattsAndUnits,
  addingAngles,
  everySolution,
  runningBackwards,
  slicingTheCone,
  pinsAndString,
  touchingTheCurve,
  linesAtAnAngle,
  lineMeetsCircle,
  tangentsAndRadicalAxis,
  wheelsAndTins,
  conesAndSpheres,
  sameShapeNewSize,
  hopsBelowZero,
  turningRoundTwice,
  betweenAnyTwo,
  shareItFairly,
  outOfAHundred,
  powersBigAndSmall,
  setsAndRelations,
  arrowsAndGraphs,
  chainsAndInverses,
  measuringTurns,
  parallelLinesAndTriangles,
  congruenceAndParallelograms,
  anglesInACircle,
  tallyMarksAndBars,
  howLikelyIsIt,
  favourableOverPossible,
  sortAndDissolve,
  separateAndProtect,
  particlesOnTheMove,
  primesAndRoots,
  growingPatterns,
  parabolasAndProgressions,
  metalOrNonMetal,
  whichMetalWins,
  fizzPHAndSalts,
  atomsToFormulae,
  countingInMoles,
  orderingTheElements,
  buretteAndFlask,
  mysterySalt,
  fusionAndTubeTests,
  namingCarbonChains,
  sameFormulaNewMolecule,
  pushingElectrons,
  breakingAndMakingBonds,
  wholeNumbersAndDecimals,
  areaOfACircle,
  netsAndSurfaceArea,
  tipToTail,
  alongTheSlope,
  goingRound,
  smallAngles,
  sharingElectrons,
  chainsAndFamilies,
  burnChangeAndClean,
  howBasicIsAnAmine,
  fromNitroToAzoDyes,
  sugarsAndStarches,
  proteinsVitaminsAndDna,
  turningEthane,
  addingAcrossDoubleBonds,
  tripleBondsAndRings,
  attackingTheRing,
  alcoholsByDegree,
  phenolsAndEthers,
  theCarbonylAttacked,
  mirrorsAndAcids,
  carbonHalogenBond,
  sn1AndSn2,
  mirrorImageMolecules,
  whenSubstitutionLoses,
  isotopesAndIsobars,
  formsOfALine,
  radiansAndWaves,
  dialsOfAWave,
  shiftAndStretch,
  riseOverRun,
  rubAndAttract,
  foilElectroscope,
  thunderAndLightning,
  liquidsThatConduct,
  bubblesAndDeposits,
  aCopperCoat,
  smoothAndRough,
  mirrorsAtAnAngle,
  upPeriscope,
  touchingACircle,
  slicesOfACircle,
  sectionAndHeron,
  lakhsAndMillions,
  roundAndRoman,
  doubleOrHalve,
  squaresOfTiles,
  tilesIntoRectangles,
  zeroesAndRemainders,
  signsAndNumberLines,
  halfPlanesAndRegions,
  theBestCorner,
  foldAndTurn,
  polygonCorners,
  facesNetsAndViews,
  airPressesAllRound,
  fastAirLowPressure,
  windsAndCyclones,
  chainsAndThreads,
  softenOrSet,
  rotOrRemain,
  oneKindOrMany,
  makingSolutions,
  lightThroughLiquids,
  whatBurningNeeds,
  flamesAndFires,
  fuelsCoalAndPetroleum,
  givingElectrons,
  outOfTheOre,
  mixingMetals,
];

/** Worlds in map order. */
export const worlds: readonly World[] = [circlesAndWaves, measureWorld, motionWorld, forcesWorld, spinWorld, skyWorld, matterWorld, heatWorld, atomsAndLightWorld, ratesWorld, balanceWorld, acidsWorld, batteriesWorld, solutionsWorld, molesWorld, willItGoWorld, shapesWorld, periodicTableWorld, lightTheBulbWorld, fractionsOnALineWorld, sourBitterOrNeitherWorld, fastAndSlowWorld, floatOrSinkWorld, changesAroundUsWorld, shadowsAndMirrorsWorld, balanceTheScaleWorld, magnetsWorld, areaAndVolumeWorld, motionGraphsWorld, forceAndMomentumWorld, workAndEnergyWorld, bendingLightWorld, currentAndResistanceWorld, insideTheAtomWorld, soundWorld, balancingEquationsWorld, rightTrianglesWorld, linesAndGraphsWorld, orbitalsWorld, electrolysisWorld, redoxWorld, batteriesAndRustWorld, dBlockWorld, complexesWorld, pBlockWorld, namingAndIsomersWorld, moTheoryWorld, lewisWorld, enthalpyWorld, mixturesWorld, rateLawsWorld, formulaeWorld, sparinglySolubleWorld, quantumAtomWorld, halogensAndNobleGasesWorld, fBlockWorld, valenceBondWorld, limitsWorld, theDerivativeWorld, rulesOfDifferentiationWorld, usingDerivativesWorld, areaSoFarWorld, kineticTheoryWorld, areaByStripsWorld, methodsOfIntegrationWorld, thermodynamicsWorld, electricFieldsWorld, differentialEquationsWorld, potentialAndCapacitanceWorld, wavesWorld, oscillationsWorld, magnetismAndMatterWorld, electromagneticInductionWorld, currentElectricityWorld, movingChargesWorld, alternatingCurrentWorld, photoelectricEffectWorld, nucleiWorld, waveOpticsWorld, fluidsInMotionWorld, rayOpticsWorld, unitsAndMeasurementWorld, semiconductorsWorld, heatTransferWorld, connectedBodiesWorld, relativeAndCircularMotionWorld, mirrorsEyeColoursWorld, elasticModuliWorld, fieldAndOrbitsWorld, rollingAndEquilibriumWorld, centreOfMassWorld, forcesPressureGravityWorld, measuringAndMovingWorld, sequencesAndSeriesWorld, complexNumbersWorld, countingAndBinomialWorld, probabilityWorld, hotAndColdWorld, currentsAtWorkWorld, vectorsInSpaceWorld, statisticsWorld, matricesAndDeterminantsWorld, solvingTrianglesWorld, workAndPowerWorld, anglesAndInversesWorld, conicSectionsWorld, linesAndCirclesWorld, roundSolidsAndSimilarityWorld, integersAndRationalsWorld, ratiosAndPowersWorld, setsRelationsFunctionsWorld, anglesAndShapesWorld, dataAndChanceWorld, materialsAndParticlesWorld, numbersAndPatternsWorld, metalsAcidsSaltsWorld, atomsAndTheTableWorld, practicalChemistryWorld, organicBasicsWorld, vectorComponentsWorld, carbonCompoundsWorld, aminesAndBiomoleculesWorld, hydrocarbonsWorld, oxygenCompoundsWorld, haloalkanesWorld, wavesOnAGraph, chargesAndLightningWorld, currentAndChemistryWorld, mirrorsAndImagesWorld, tangentsAndSectorsWorld, bigNumbersAndProportionWorld, identitiesAndPolynomialsWorld, inequalitiesAndOptimisationWorld, symmetryAndSolidsWorld, airAndWindWorld, fibresAndPlasticsWorld, pureAndMixedWorld, combustionAndFuelsWorld, ionsAndOresWorld];

export * from "./curriculum";

export function getLevel(id: string): Level | undefined {
  return levels.find((l) => l.id === id);
}

/** The world a level belongs to. */
export function worldOf(levelId: string): World | undefined {
  return worlds.find((w) => w.levels.includes(levelId));
}

export { ionsAndOres, combustionAndFuels, pureAndMixed, fibresAndPlastics, airAndWindLab, symmetryAndSolids, inequalitiesAndOptimisation, identitiesAndPolynomials, bigNumbersAndProportion, tangentsAndSectors, mirrorsAndImagesLab, currentAndChemistry, chargesAndLightning, haloalkanes, oxygenCompounds, hydrocarbons, aminesAndBiomolecules, carbonCompounds, organicBasics, practicalChemistry, atomsAndTheTable, metalsAcidsSalts, numbersAndPatterns, materialsAndParticles, dataAndChance, anglesAndShapes, setsRelationsFunctions, ratiosAndPowers, integersAndRationals, roundSolidsAndSimilarity, linesAndCircles, conicSections, anglesAndInverses, workAndPower, solvingTriangles, matricesAndDeterminants, statisticsLab, vectorsInSpace, currentsAtWork, hotAndColdLab, probabilityLab, countingAndBinomial, complexNumbers, sequencesAndSeries, measuringAndMoving, forcesPressureGravity, centreOfMass, rollingAndEquilibrium, fieldAndOrbits, elasticModuli, mirrorsEyeColoursLab, relativeAndCircularMotion, connectedBodies, heatTransfer, semiconductors, unitsAndMeasurement, rayOpticsLab, fluidsInMotion, waveOptics, nucleiLab, photoelectricEffect, alternatingCurrent, movingChargesAndMagnetism, currentElectricity, electromagneticInduction, magnetismAndMatter, oscillations, wavesAndSound, potentialAndCapacitance, differentialEquations, electricChargesAndFields, thermodynamicsLab, methodsOfIntegration, areaByStrips, kineticTheory, fundamentalTheorem, optimisationAndRates, rulesOfDifferentiation, slopeGraph, limitsAndContinuity, valenceBondTheory, lanthanoidsAndActinoids, halogensAndNobleGases, nucleusAndMatterWaves, solubilityProduct, formulaeAndConcentration, rateLaws, liquidMixtures, enthalpyAndHess, lewisStructures, molecularOrbitals, complexIsomers, pBlock, coordinationCompounds, transitionMetals, batteriesAndCorrosion, redoxReactions, electrolysisAndConductance, atomicOrbitals, linesAndGraphs, rightTriangles, chemicalEquations, soundAndEchoes, structureOfTheAtom, currentAndResistance, bendingLight, areaAndVolume, funWithMagnets, balanceTheScale, lightAndShadows, fractionsOnALine, simpleCircuits, molecularShapes, periodicTrends, molesAndReactions, gibbsEnergy, galvanicCells, colligativeProperties, chemicalEquilibrium, acidsAndBases, hydrogenSpectrum, reactionRates, gravitation, propertiesOfSolids, propertiesOfFluids, thermalProperties, lawsOfMotion, workEnergy, momentumCollisions, rotationalMotion, motionInAStraightLine, projectileMotion, vernierCalliper, secantToTangent, sinusoidalFunctions, unitCircleSineCosine, vectorComponents };

export { buildFormulaBank, symbolicText, type FormulaCard } from "./formulas/bank";
export type { FormulaSymbol, StandaloneFormula } from "./formulas/schema";
export { schoolFormulas } from "./formulas/school";
