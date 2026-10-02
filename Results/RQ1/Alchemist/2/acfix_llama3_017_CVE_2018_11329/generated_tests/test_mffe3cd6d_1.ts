import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant mffe3cd6d - calculateDrugBuy return statement", function () {
  it("should detect mutant that removes return keyword from calculateDrugBuy", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to initialize the contract
    await instance.connect(owner).seedMarket(1000);

    // Call calculateDrugBuy with a non-zero ETH amount
    const ethAmount = ethers.parseEther("1.0");
    const contractBalance = ethers.parseEther("10.0");
    const result = await instance.calculateDrugBuy(ethAmount, contractBalance);

    // The original should return a positive value proportional to the ETH input
    // The mutant returns 0 because the return statement is missing
    expect(result).to.be.gt(0);
  });
});