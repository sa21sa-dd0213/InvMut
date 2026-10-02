import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant ma07826ef detection", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Call Put with _unlockTime = 0 (which should default to block.timestamp in original)
    const tx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await tx.wait();
    
    // Check the unlockTime stored for addr1
    const holder = await instance.Acc(addr1.address);
    
    // In the original, unlockTime should equal block.timestamp
    // In the mutant, it would equal block.prevrandao (which is different from timestamp)
    expect(holder.unlockTime).to.equal(currentTimestamp);
  });
});