import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m2f010c39", function () {
  it("should revert when collecting more than balance in original, but mutant allows overdraft", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor arg for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deposit exactly 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Attempt to collect 2 ether (more than balance)
    const withdrawAmount = ethers.parseEther("2");
    
    // In the original, this should revert (balance < withdrawal amount)
    // In the mutant (balance <= _am), 1 ether <= 2 ether is TRUE, so it would NOT revert -> kills the mutant
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});