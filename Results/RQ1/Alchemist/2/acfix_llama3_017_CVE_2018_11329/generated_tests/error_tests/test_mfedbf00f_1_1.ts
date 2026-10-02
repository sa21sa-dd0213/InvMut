import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - mutant mfedbf00f test", function () {
  it("should detect the min function mutation (a < b -> a > b) by checking getDrugsSinceLastCollect after a long wait", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("1");
    await instance.seedMarket(seedDrugs, { value: ethers.parseEther("1") });

    // Get free kilos for addr1 to start earning drugs
    await instance.connect(addr1).getFreeKilo();

    // Get the kilos assigned to addr1
    const kilos = await instance.getMyKilo();

    // Get DRUGS_TO_PRODUCE_1KILO value
    const drugsToProduce = await instance.DRUGS_TO_PRODUCE_1KILO();

    // Wait longer than DRUGS_TO_PRODUCE_1KILO seconds to ensure we exceed the cap
    await ethers.provider.send("evm_increaseTime", [Number(drugsToProduce) + 100]);
    await ethers.provider.send("evm_mine");

    // Get the drugs since last collect - should be capped at DRUGS_TO_PRODUCE_1KILO * kilos
    const drugsSinceLastCollect = await instance.getDrugsSinceLastCollect(addr1.address);

    // Calculate expected capped value: min(DRUGS_TO_PRODUCE_1KILO, secondsPassed) * Kilos
    // Since we waited > DRUGS_TO_PRODUCE_1KILO, the cap should be DRUGS_TO_PRODUCE_1KILO
    const expectedCappedValue = drugsToProduce * kilos;

    // On the original contract, this returns the capped value
    // On the mutant (a > b instead of a < b), it returns secondsPassed * kilos which would be larger
    expect(drugsSinceLastCollect).to.equal(expectedCappedValue);
  });
});