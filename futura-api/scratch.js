const currentAge = 23;
const retirementAge = 60;
const lifeExpectancy = 80;
const monthlyIncome = 45000;
const monthlyExpense = 30000;
const currentSavings = 50000;
const monthlyInvestment = 2000;
const inflationRate = 0.06;
const returnRate = 0.12;

const yearsToRetirement = retirementAge - currentAge; // 37
const yearsAfterRetirement = lifeExpectancy - retirementAge; // 20

const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflationRate, yearsToRetirement);
const realRate = ((1 + returnRate) / (1 + inflationRate)) - 1;

const corpusNeeded = futureMonthlyExpense * 12 * (1 - Math.pow(1 + realRate, -yearsAfterRetirement)) / realRate;

console.log("Future Monthly Expense: " + futureMonthlyExpense);
console.log("Real Rate: " + realRate);
console.log("Corpus Needed: " + corpusNeeded);
console.log("If divided by 10 it is " + corpusNeeded / 10);
