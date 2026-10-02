import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - md54e41be", function () {
  it("should detect the mutant by verifying exact ether forwarding to target address", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialTargetBalance = await ethers.provider.getBalance(targetAddress);
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const sendAmount = ethers.parseEther("1.0");

    // Call go() with exactly 1 ether
    const tx = await instance.connect(attacker).go({ value: sendAmount });
    await tx.wait();

    const finalTargetBalance = await ethers.provider.getBalance(targetAddress);
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    // In the original contract: target receives exactly sendAmount, owner receives nothing (contract balance is 0)
    // In the mutant: target receives sendAmount + 1 (or call fails), causing a different balance distribution
    expect(finalTargetBalance - initialTargetBalance).to.equal(sendAmount);
    expect(finalOwnerBalance - initialOwnerBalance).to.equal(0);
  });
});