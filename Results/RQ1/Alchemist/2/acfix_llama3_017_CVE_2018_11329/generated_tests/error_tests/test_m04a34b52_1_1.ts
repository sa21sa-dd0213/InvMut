import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - Kill mutant m04a34b52 (block.timestamp replaced by block.prevrandao)", function () {
  it("should revert when collectDrugs is called and prevrandao breaks time-based drug calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for EtherCartel)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to initialize
    await instance.connect(owner).seedMarket(100, { value: ethers.parseEther("1") });

    // Give addr1 some free kilos to start producing drugs
    await instance.connect(addr1).getFreeKilo();

    // Record the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;

    // Call collectDrugs which sets lastCollect to block.prevrandao instead of block.timestamp
    await instance.connect(addr1).collectDrugs(ethers.ZeroAddress);

    // Get the block where collectDrugs was called
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);

    // Check that lastCollect for addr1 is NOT equal to block.timestamp (should be prevrandao)
    const lastCollect = await instance.lastCollect(addr1.address);
    expect(lastCollect).to.not.equal(blockAfter.timestamp);

    // Verify that getMyDrugs returns 0 because prevrandao > timestamp causing underflow in subtraction
    const myDrugs = await instance.getMyDrugs();
    expect(myDrugs).to.equal(0);

    // The mutant fails because prevrandao is much larger than current timestamp,
    // so SafeMath.sub reverts on underflow, making getMyDrugs() return 0
    // In the original, lastCollect = timestamp, so drugsSinceLastCollect would be positive
  });
});