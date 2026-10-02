import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant mfedbf00f - min function", function () {
  it("should cap secondsPassed at DRUGS_TO_PRODUCE_1KILO when more time has elapsed", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize
    const seedDrugs = 1000;
    await instance.seedMarket(seedDrugs, { value: ethers.parseEther("1") });

    // User gets free kilos
    await instance.connect(user).getFreeKilo();
    
    // Get user's kilos
    const userKilos = await instance.connect(user).getMyKilo();
    
    // Fast forward time to more than DRUGS_TO_PRODUCE_1KILO (86400 seconds)
    const DRUGS_TO_PRODUCE_1KILO = 86400n;
    await ethers.provider.send("evm_increaseTime", [Number(DRUGS_TO_PRODUCE_1KILO) + 1000]);
    await ethers.provider.send("evm_mine", []);

    // Call getDrugsSinceLastCollect
    const drugsSinceLastCollect = await instance.connect(user).getDrugsSinceLastCollect(user.address);
    
    // Expected: capped at DRUGS_TO_PRODUCE_1KILO * userKilos
    const expectedDrugs = DRUGS_TO_PRODUCE_1KILO * userKilos;
    
    // Original contract returns expectedDrugs, mutant returns larger value
    expect(drugsSinceLastCollect).to.equal(expectedDrugs);
  });
});