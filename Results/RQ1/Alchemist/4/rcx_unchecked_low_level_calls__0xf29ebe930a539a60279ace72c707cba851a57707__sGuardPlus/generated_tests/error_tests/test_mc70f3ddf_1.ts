import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mc70f3ddf", function () {
  it("should detect msg.value+1 mutation by sending maximum balance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance for fallback
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attacker sends exactly their entire balance
    const attackerBalance = await ethers.provider.getBalance(attacker.address);
    const sendAmount = attackerBalance - ethers.parseEther("0.01"); // Leave small amount for gas
    
    // This should succeed on original but fail on mutant due to msg.value+1
    await expect(
      instance.connect(attacker).go({ value: sendAmount })
    ).to.be.reverted;
  });
});