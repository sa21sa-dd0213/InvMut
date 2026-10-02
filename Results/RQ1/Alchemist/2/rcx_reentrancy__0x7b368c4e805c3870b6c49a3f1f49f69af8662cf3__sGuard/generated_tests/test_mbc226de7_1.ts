import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mbc226de7 test", function () {
  it("should detect the mutant that changed >= to <= in Collect condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 2 ether (greater than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Fast forward time past the unlock time (block.timestamp is used)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 1 ether - should succeed on original but fail on mutant
    const collectAmount = ethers.parseEther("1");
    
    // On the original contract, balance >= MinSum (2 >= 1) so this would succeed
    // On the mutant, balance <= MinSum (2 <= 1) is false, so it reverts
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});