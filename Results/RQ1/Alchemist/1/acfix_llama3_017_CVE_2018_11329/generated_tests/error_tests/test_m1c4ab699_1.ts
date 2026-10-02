import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1c4ab699 by verifying calculateDrugSell returns the correct value from calculateTrade", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to set initial state
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // Get the expected return value from calculateTrade directly
    const drugs = 500;
    const marketDrugs = await instance.marketDrugs();
    const contractBalance = await ethers.provider.getBalance(instance.target);
    const expectedValue = await instance.calculateTrade(drugs, marketDrugs, contractBalance);

    // Call calculateDrugSell and verify it returns the same value
    const actualValue = await instance.calculateDrugSell(drugs);
    expect(actualValue).to.equal(expectedValue);
  });
});