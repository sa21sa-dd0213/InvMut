import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m04a34b52 detection", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in collectDrugs", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Give addr1 some starting kilos via getFreeKilo
    await instance.connect(addr1).getFreeKilo();

    // Record the current block timestamp before calling collectDrugs
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore!.timestamp;

    // Call collectDrugs with no referral
    await instance.connect(addr1).collectDrugs(ethers.ZeroAddress);

    // Get the block after the transaction
    const blockAfter = await ethers.provider.getBlock("latest");
    const timestampAfter = blockAfter!.timestamp;

    // Calculate expected seconds passed (should be 0 or very small)
    const expectedSecondsPassed = timestampAfter - timestampBefore;

    // Get actual drugs since last collect from the contract
    const actualDrugsSinceCollect = await instance.connect(addr1).getDrugsSinceLastCollect(addr1.address);

    // If block.prevrandao was used instead of block.timestamp,
    // the value will be astronomically large (like 2^64) instead of near 0
    // We assert that the value is reasonably small (less than 100 seconds worth of production)
    const maxReasonableDrugs = expectedSecondsPassed * 300; // 300 kilos * seconds passed
    expect(actualDrugsSinceCollect).to.be.lessThanOrEqual(maxReasonableDrugs + 1);

    // Additional check: if the mutant is active, prevrandao will be huge (> 10^18)
    // so we also verify it's not absurdly large
    expect(actualDrugsSinceCollect).to.be.lessThan(ethers.parseEther("1"));
  });
});