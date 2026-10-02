import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - getMyDrugs return removal", function () {
  it("should kill mutant m66fc5789 by asserting getMyDrugs() returns positive value after accumulating drugs", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EtherCartel)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(100, { value: ethers.parseEther("1") });

    // User gets free kilo
    await instance.connect(user).getFreeKilo();

    // Advance time by at least 1 second to accumulate drugs
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Call getMyDrugs() - should return > 0 in original, but 0 in mutant
    const drugs = await instance.connect(user).getMyDrugs();

    // This assertion will fail on the mutant because it returns 0 instead of the computed value
    expect(drugs).to.be.gt(0);
  });
});