import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m31bd0739 - failed withdrawal balance check", function () {
  it("should revert when withdrawing to a contract that rejects Ether, keeping balance unchanged", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious receiver that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory(
      "contract MaliciousReceiver { receive() external payable { revert(); } }"
    );
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the attacker's balance in Reentrance - use malicious contract as attacker
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(attacker).addToBalance({ value: depositAmount });
    
    // Verify initial balance
    expect(await instance.getBalance(attacker.address)).to.equal(depositAmount);
    
    // Attempt withdrawal - should revert because malicious contract rejects Ether
    await expect(
      instance.connect(attacker).withdrawBalance()
    ).to.be.reverted;
    
    // Balance should remain unchanged (mutant would set it to 0 even on failed call)
    expect(await instance.getBalance(attacker.address)).to.equal(depositAmount);
  });
});