import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - Put uses block.prevrandao", function () {
  it("should kill mutant by showing Collect reverts when unlockTime defaults to block.prevrandao", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp for reference
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;
    
    // addr1 calls Put with _unlockTime = 0 (far in the past)
    // In original: unlockTime becomes current block.timestamp
    // In mutant: unlockTime becomes block.prevrandao (random, likely huge)
    const putAmount = ethers.parseEther("2");
    const putTx = await instance.connect(addr1).Put(0, { value: putAmount });
    await putTx.wait();
    
    // Verify balance was added
    const holderBefore = await instance.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(putAmount);
    
    // Now try to Collect the full amount
    // In original: block.timestamp > unlockTime (since unlockTime = block.timestamp) -> true after next block
    // In mutant: block.timestamp > block.prevrandao is almost certainly false (prevrandao is huge)
    const collectTx = instance.connect(addr1).Collect(putAmount);
    
    // The mutant will revert because prevrandao is a large random value > current timestamp
    // The original would succeed (or possibly revert for other reasons, but definitely not this one)
    await expect(collectTx).to.be.reverted;
  });
});