import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mb4265566 - target address zero", function () {
  it("should kill mutant by checking that Ether is NOT sent to the intended target address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const intendedTarget = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialBalance = await ethers.provider.getBalance(intendedTarget);
    
    const sendAmount = ethers.parseEther("1.0");
    
    // Fund the contract with some Ether first so it can send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });

    // Call go() which should send Ether to intendedTarget in original
    // but to address(0) in the mutant
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(intendedTarget);
    
    // In the original, the intended target receives Ether
    // In the mutant (address(0)), the intended target's balance stays the same
    // This assertion will fail on the mutant, killing it
    expect(finalBalance - initialBalance).to.equal(sendAmount);
  });
});