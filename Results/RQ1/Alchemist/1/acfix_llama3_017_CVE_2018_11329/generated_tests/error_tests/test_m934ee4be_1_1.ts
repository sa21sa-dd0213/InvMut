import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m934ee4be", function () {
  it("should return correct value from calculateDrugBuySimple, not zero", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    // Constructor has no arguments - deploy without constructorArgs
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract and set marketDrugs
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // Now call calculateDrugBuySimple with some eth value
    const ethAmount = ethers.parseEther("1");
    const result = await instance.calculateDrugBuySimple(ethAmount);

    // Get the contract balance to manually compute expected value
    const contractBalance = await instance.getBalance();
    const expected = await instance.calculateDrugBuy(ethAmount, contractBalance);

    // The mutant returns 0 instead of the actual computed value
    // On original this will pass; on mutant result will be 0 and expect will fail
    expect(result).to.equal(expected);
  });
});