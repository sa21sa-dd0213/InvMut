import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m68f1896c - min function", function () {
  it("should cap seconds passed to DRUGS_TO_PRODUCE_1KILO when collecting drugs after long period", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // User gets free kilos to start
    await instance.connect(user).getFreeKilo();

    // Fast forward time by more than DRUGS_TO_PRODUCE_1KILO (86400 seconds)
    // For example, 100000 seconds
    await ethers.provider.send("evm_increaseTime", [100000]);
    await ethers.provider.send("evm_mine");

    // Get the expected drugs: capped at 86400 seconds * 300 kilos = 25,920,000
    const expectedCappedDrugs = 86400n * 300n; // DRUGS_TO_PRODUCE_1KILO * STARTING_KILOS

    // Call getMyDrugs() which internally uses min() via getDrugsSinceLastCollect
    const actualDrugs = await instance.connect(user).getMyDrugs();

    // On original: should equal capped value
    // On mutant (broken min): would be 100000 * 300 = 30,000,000 which is > expectedCappedDrugs
    expect(actualDrugs).to.equal(expectedCappedDrugs);
  });
});