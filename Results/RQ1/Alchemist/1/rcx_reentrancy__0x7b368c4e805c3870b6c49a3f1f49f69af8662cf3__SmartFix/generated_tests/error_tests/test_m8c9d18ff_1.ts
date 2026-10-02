import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m8c9d18ff test", function () {
  it("should detect mutant by allowing Collect when balance > MinSum in original but reverting in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deposit more than MinSum (MinSum = 1 ether)
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect 1 ether (balance > MinSum should succeed in original)
    const collectAmount = ethers.parseEther("1");
    
    // In the mutant, this should revert because balance (2 ether) > MinSum (1 ether)
    // but mutant requires balance <= MinSum
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});