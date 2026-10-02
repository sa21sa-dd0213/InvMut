import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant me575be82 test", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await W_WALLETFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;
    
    // Call Put with _unlockTime less than current timestamp
    // This should set unlockTime to current timestamp in original, but to block.prevrandao in mutant
    const putAmount = ethers.parseEther("1");
    await walletInstance.connect(addr1).Put(currentTimestamp - 100, { value: putAmount });
    
    // Try to collect the full balance immediately
    // Should succeed in original (unlockTime = block.timestamp), fail in mutant (unlockTime = block.prevrandao)
    await expect(
      walletInstance.connect(addr1).Collect(putAmount)
    ).to.be.reverted;
  });
});