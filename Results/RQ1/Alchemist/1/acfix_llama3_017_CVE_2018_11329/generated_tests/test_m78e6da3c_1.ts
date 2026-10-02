import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - getDrugsSinceLastCollect", function () {
  it("should kill mutant m78e6da3c by detecting block.prevrandao instead of block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("1") });

    // Get free kilo for addr1 to set lastCollect and Kilos
    await instance.connect(addr1).getFreeKilo();

    // Wait some time to accumulate drugs
    const waitTime = 100; // seconds
    await ethers.provider.send("evm_increaseTime", [waitTime]);
    await ethers.provider.send("evm_mine", []);

    // Call getDrugsSinceLastCollect - should return a positive value based on elapsed time
    const drugsSinceLastCollect = await instance.connect(addr1).getDrugsSinceLastCollect(addr1.address);

    // In the original, this should be > 0 and proportional to waitTime * Kilos / DRUGS_TO_PRODUCE_1KILO
    // In the mutant using block.prevrandao, it will likely underflow (revert) or return an unrelated value
    // We expect the call to either revert or return a value that doesn't match the expected time-based calculation
    const expectedDrugs = BigInt(waitTime) * 300n / 86400n; // Kilos = 300, DRUGS_TO_PRODUCE_1KILO = 86400
    expect(drugsSinceLastCollect).to.be.closeTo(expectedDrugs, 1n); // Allow small rounding difference
  });
});