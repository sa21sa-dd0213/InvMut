import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mutant m74486e76 test - sends to address(0) instead of hardcoded address", function () {
  it("should detect that ETH is sent to address(0) instead of the hardcoded target", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const hardcodedTarget = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialTargetBalance = await ethers.provider.getBalance(hardcodedTarget);
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const sendAmount = ethers.parseEther("1.0");

    // Fund the contract with some ETH via fallback so it has balance to transfer to owner
    await owner.sendTransaction({ to: instance.target, value: sendAmount });

    // Call go() which should send ETH to hardcoded target in original, but to address(0) in mutant
    await instance.connect(addr1).go({ value: sendAmount });

    const finalTargetBalance = await ethers.provider.getBalance(hardcodedTarget);
    const finalContractBalance = await ethers.provider.getBalance(instance.target);

    // In the original, target balance should increase by sendAmount (minus gas for the call)
    // In the mutant, target balance should remain unchanged because ETH goes to address(0)
    expect(finalTargetBalance).to.equal(initialTargetBalance + sendAmount);
  });
});