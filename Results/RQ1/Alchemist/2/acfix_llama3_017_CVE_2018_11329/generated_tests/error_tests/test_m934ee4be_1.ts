import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m934ee4be", function () {
  it("should kill the mutant by asserting calculateDrugBuySimple returns the correct value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract and set marketDrugs
    const seedDrugs = 1000;
    const seedEth = ethers.parseEther("10");
    await instance.seedMarket(seedDrugs, { value: seedEth });

    // Call calculateDrugBuySimple with a specific ETH amount
    const testEth = ethers.parseEther("1");
    const result = await instance.calculateDrugBuySimple(testEth);

    // Expected value should match the internal calculateDrugBuy call
    const contractBalance = await ethers.provider.getBalance(instance.target);
    const expected = await instance.calculateDrugBuy(testEth, contractBalance);

    // If the mutant removed the return, result will be 0 instead of the expected value
    expect(result).to.equal(expected);
  });
});