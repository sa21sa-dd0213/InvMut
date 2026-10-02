import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m476ef69f by checking that Put with future unlockTime prevents immediate Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore!.timestamp;

    // Set a future unlock time (current time + 1000 seconds)
    const futureUnlockTime = currentTime + 1000;

    // addr1 calls Put with 2 ether and a future unlock time
    const putAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(futureUnlockTime, { value: putAmount });

    // Now try to Collect immediately (before unlock time)
    // In the original contract, Collect should revert because block.timestamp < unlockTime
    // In the mutant, Collect would succeed because unlockTime is set to current timestamp
    const collectAmount = ethers.parseEther("1");

    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});