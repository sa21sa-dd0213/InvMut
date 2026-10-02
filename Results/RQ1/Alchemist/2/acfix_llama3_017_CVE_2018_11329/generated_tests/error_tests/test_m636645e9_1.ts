import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m636645e9", function () {
  it("should kill the mutant by verifying calculateTrade returns non-zero value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize and provide marketDrugs and ETH balance
    const seedAmount = ethers.parseEther("10");
    await instance.connect(owner).seedMarket(1000, { value: seedAmount });

    // Now calculateDrugSell relies on calculateTrade - should return non-zero for positive drugs
    const drugsToSell = 100;
    const sellValue = await instance.calculateDrugSell(drugsToSell);
    
    // The mutant's calculateTrade returns 0, so this assertion will fail on the mutant
    expect(sellValue).to.be.gt(0);
    
    // Also verify a specific known calculation to be thorough
    const drugBuyValue = await instance.calculateDrugBuy(ethers.parseEther("1"), seedAmount);
    expect(drugBuyValue).to.be.gt(0);
  });
});