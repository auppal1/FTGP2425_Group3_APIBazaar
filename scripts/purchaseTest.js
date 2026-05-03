const basePrice = 1;
const capacity = 12;

function getPurchasePrice (amount, supply) {
    let purchasePrice;
    // Convert stepPoint to integer so that it will have the same value as
    // in solidity
    let stepPoint = parseInt(capacity * 90/100); // rounds down to nearest whole number

    if (supply + amount <= stepPoint) {
        // prices are entirely within constant portion of bonding curve
        purchasePrice = basePrice * amount;
    }
        else if (supply >= stepPoint) {
        // pricing is enirely within cubic portion of curve
        // cumulative cubic contribution above current supply
        let overCubicValue = (supply + amount - stepPoint)**4;
        // cumulative cubic contribution between stepPoint and current supply
        let underCubicValue = (supply - stepPoint)**4;
        // total cubic contribution
        let cubicContribution = overCubicValue - underCubicValue;
        // total purchase price = cubic contribution + constant contribution
        purchasePrice = cubicContribution + (basePrice * amount);
    }
    else {
        // if amount crosses stepPoint, find how much amount is over and under stepPoint
        let overAmount = supply + amount - stepPoint;
        let underAmount = amount - overAmount;
        // cumulative cubic contribution toward overPrice
        let overCubicValue = overAmount**4;
        // total overPrice = cubic price contribution + constant price
        let overPrice = overCubicValue + (basePrice * overAmount);
        // calculate price for constant portion of curve
        let underPrice = basePrice * underAmount;  // price of amount under stepPoint
        // total price of minting is the price over the step + price under the step 
        purchasePrice = overPrice + underPrice;
    }

    return purchasePrice;
}


for (supply = 0; supply < capacity; supply++) {
    let prices = [];
    for (amount = 1; amount <= capacity - supply; amount++) {
        price = getPurchasePrice(amount, supply);
        prices.push(price);
    }
    console.log(prices);
}
