import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - msg.value+1", function () {
  it("should detect mutant that sends msg.value+1 instead of msg.value to target", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const targetBalanceBefore = await ethers.provider.getBalance(targetAddress);
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    // Send exactly 1 wei to the go function
    const sendAmount = ethers.parseEther("0");
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();

    const targetBalanceAfter = await ethers.provider.getBalance(targetAddress);
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    // In the original, target receives exactly 1 wei, owner gets nothing
    // In the mutant, contract tries to send 2 wei (msg.value+1) but only has 1 wei -> revert
    expect(targetBalanceAfter - targetBalanceBefore).to.equal(1n);
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
  });
});