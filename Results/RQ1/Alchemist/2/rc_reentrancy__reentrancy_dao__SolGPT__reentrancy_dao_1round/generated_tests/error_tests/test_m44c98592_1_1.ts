import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m44c98592", function () {
  it("should revert when withdrawal call fails (original) but mutant would not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a malicious receiver contract that always reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    const maliciousAddress = await malicious.getAddress();

    // Fund the malicious contract so it can deposit
    await owner.sendTransaction({
      to: maliciousAddress,
      value: ethers.parseEther("1.0")
    });

    // Deposit from malicious contract into ReentrancyDAO
    await malicious.connect(owner).depositToDAO(instanceAddress, { value: ethers.parseEther("1.0") });

    // Try to withdraw - should revert on original, but mutant would not revert
    await expect(
      malicious.connect(owner).attackWithdraw(instanceAddress)
    ).to.be.reverted;

    // Verify that state is not corrupted on original (mutant would have deducted balance)
    const balance = await instance.balance();
    expect(balance).to.equal(ethers.parseEther("1.0"));
  });
});