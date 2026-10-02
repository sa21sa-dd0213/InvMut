import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - mbd3c0da5", function () {
  it("should revert when deadline equals block.timestamp (mutant requires >)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with constructor arguments (adjust as needed based on actual constructor)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Set deadline equal to current block.timestamp
    const deadline = currentTimestamp;

    // Attempt to call sellShares with deadline exactly equal to block.timestamp
    // The original requires deadline >= block.timestamp (should pass)
    // The mutant requires deadline > block.timestamp (should revert)
    await expect(
      instance.connect(addr1).sellShares(
        0, // shareAmount (minimal to trigger deadline check)
        addr1.address, // to
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        deadline // deadline == block.timestamp
      )
    ).to.be.revertedWith("TIME_EXPIRED");
  });
});