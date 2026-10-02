import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m4e7a8403 by reverting on Collect at exactly unlockTime (original) vs succeeding (mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block.timestamp;
    
    // Put 2 ether with unlockTime set to current timestamp (exactly now)
    const putTx = await instance.connect(addr1).Put(currentTime, { value: ethers.parseEther("2") });
    await putTx.wait();
    
    // Verify balance and MinSum (1 ether) - balance >= MinSum is satisfied
    const minSum = await instance.MinSum();
    expect(minSum).to.equal(ethers.parseEther("1"));
    
    // Try to Collect 1 ether at exactly the unlock time
    // Original contract requires block.timestamp > acc.unlockTime (strictly after)
    // Mutant uses >= which would allow collection at exactly unlockTime
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
    
    // If the test passes (reverts), it detects the mutant because:
    // - Original: reverts since timestamp is not strictly greater
    // - Mutant: would succeed (no revert), failing the test
  });
});