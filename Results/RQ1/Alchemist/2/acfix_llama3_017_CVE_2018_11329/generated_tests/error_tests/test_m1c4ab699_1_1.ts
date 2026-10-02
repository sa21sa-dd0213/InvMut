import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - m1c4ab699", function () {
  it("should kill mutant by asserting calculateDrugSell returns non-zero value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize and set marketDrugs
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("10") });

    // Give addr1 some kilos via getFreeKilo so they have drugs to sell
    await instance.connect(addr1).getFreeKilo();

    // Advance time to accumulate some drugs
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // Calculate expected sell value for the drugs addr1 has
    const drugsHeld = await instance.connect(addr1).getMyDrugs();
    const expectedValue = await instance.calculateDrugSell(drugsHeld);

    // In the original, expectedValue should be > 0
    // In the mutant, calculateDrugSell returns 0 due to missing return statement
    expect(expectedValue).to.be.gt(0);
  });
});