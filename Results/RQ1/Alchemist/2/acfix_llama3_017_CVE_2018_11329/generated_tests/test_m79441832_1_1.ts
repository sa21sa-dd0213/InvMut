import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - min function", function () {
  it("should detect mutant that changes min to use <= instead of <", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Get free kilos to have some production
    await instance.getFreeKilo();

    // Wait exactly DRUGS_TO_PRODUCE_1KILO seconds (86400 seconds)
    // This creates the equality case where secondsPassed == DRUGS_TO_PRODUCE_1KILO
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    // Get drugs since last collect - this uses min internally
    const kilos = await instance.getMyKilo();
    const expectedDrugs = BigInt(86400) * kilos;
    const actualDrugs = await instance.getDrugsSinceLastCollect(owner.address);

    // Verify getMyDrugs() works correctly
    const myDrugs = await instance.getMyDrugs();
    expect(myDrugs).to.equal(expectedDrugs);

    // Additional verification: collect drugs and check that the math is consistent
    await instance.collectDrugs(ethers.ZeroAddress);

    // After collect, claimedDrugs should be 0 and lastCollect should be updated
    const claimedDrugs = await instance.claimedDrugs(owner.address);
    expect(claimedDrugs).to.equal(0);
  });
});