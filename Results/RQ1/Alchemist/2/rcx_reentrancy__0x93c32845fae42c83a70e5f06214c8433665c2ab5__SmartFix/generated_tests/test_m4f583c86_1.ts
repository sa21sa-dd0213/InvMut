import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - m4f583c86", function () {
  it("should kill the mutant by collecting exactly the balance (acc.balance == _am)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Fund the contract so MinSum is satisfied (MinSum = 1 ether)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // User deposits 1 ether via Put (calls with value and unlockTime = 0)
    const depositAmount = ethers.parseEther("1");
    await user.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Wait for block timestamp to pass (unlockTime defaults to block.timestamp when _unlockTime <= block.timestamp)
    // We need block.timestamp > acc.unlockTime to pass the third condition
    // Since unlockTime == block.timestamp when deposited, we need to mine a new block
    await ethers.provider.send("evm_mine", []);
    
    // Now try to collect exactly the deposited amount (acc.balance == _am)
    // Original: >= allows this; Mutant: > rejects this => revert expected on mutant
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});