const basePrice = 1;
const capacity = 12;

function getSalePrice (amount, supply) {
    let salePrice;
    // Convert stepPoint to integer so that it will have the same value as
    // in solidity
    let stepPoint = parseInt(capacity * 90/100); // rounds down to nearest whole number

    if (supply <= stepPoint) {
        // sale prices are entirely within constant portion of curve
        salePrice = basePrice * amount;
    }
    else if (supply - amount >= stepPoint) {
        // sale prices are entirely within cubic portion of curve
        // cumulative cubic contribution before sale
        let beforeCubicValue = (supply - stepPoint)**4;
        // cumulative cubic contribution after sale
        let afterCubicValue = (supply - amount - stepPoint)**4;
        // total cubic contribution
        let cubicContribution = beforeCubicValue - afterCubicValue;
        // total sale price = cubic contribution + constant contribution
        salePrice = cubicContribution + (basePrice * amount);
    }
    else {
        // if amount crosses stepPoint, find out how much is over and under stepPoint
        let overAmount = supply - stepPoint;
        let underAmount = amount - overAmount;
        // calculate sale price for cubic portion of sale
        // cumulative cubic portion before crossing stepPoint
        let beforeCubicValue = overAmount**4;
        // total overPrice = cubic price contribution + constant price contribution
        let overPrice = beforeCubicValue + (basePrice * overAmount);
        // calculate sale price for constant portion of sale
        let underPrice = basePrice * underAmount;
        // total sale price = price above the step + price below the step
        salePrice = overPrice + underPrice;
    }
    return salePrice;
}


for (supply = capacity; supply > 0; supply--) {
    let prices = [];
    for (amount = 1; amount <= supply; amount++) {
        price = getSalePrice(amount, supply);
        prices.push(price);
    }
    console.log(prices);
}
