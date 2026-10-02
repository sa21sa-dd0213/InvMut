import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - mdf965874", function () {
  it("should detect mutation of block.timestamp to block.prevrandao in sellDrugs", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(100, { value: ethers.parseEther("1") });

    // Give addr1 some free kilos so they can produce drugs
    await instance.connect(addr1).getFreeKilo();

    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;

    // Call sellDrugs to trigger the mutation (sets lastCollect[addr1])
    await instance.connect(addr1).sellDrugs();

    // Get the block after the transaction
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);

    // Get the seconds passed since last collect
    const secondsPassed = await instance.connect(addr1).getDrugsSinceLastCollect(addr1.address);

    // Calculate expected seconds: time difference between current block timestamp and the timestamp before
    const expectedSeconds = Math.min(
      86400,
      Number(blockAfter.timestamp) - Number(timestampBefore)
    );

    // If the mutation is present (block.prevrandao used), secondsPassed will NOT equal expectedSeconds
    // If the original code (block.timestamp) is used, they should match
    expect(secondsPassed).to.equal(expectedSeconds);
  });
});