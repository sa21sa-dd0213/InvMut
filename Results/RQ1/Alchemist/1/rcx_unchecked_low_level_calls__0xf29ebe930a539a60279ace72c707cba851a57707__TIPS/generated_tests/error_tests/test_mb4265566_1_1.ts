import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant test - mb4265566", function () {
  it("should fail to send funds to the intended target when target is address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const targetBalanceBefore = await ethers.provider.getBalance(targetAddress);
    const instanceBalanceBefore = await ethers.provider.getBalance(instance.target);
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Send 1 ETH via go() from addr1
    const tx = await instance.connect(addr1).go({ value: ethers.parseEther("1") });
    await tx.wait();

    const targetBalanceAfter = await ethers.provider.getBalance(targetAddress);
    const instanceBalanceAfter = await ethers.provider.getBalance(instance.target);
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    // On original: target should have received the 1 ETH
    // On mutant: target receives nothing, owner gets everything
    expect(targetBalanceAfter - targetBalanceBefore).to.equal(ethers.parseEther("1"));
    expect(instanceBalanceAfter).to.equal(0n);
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ethers.parseEther("1"));
  });
});