import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m74486e76 test", function () {
  it("should send Ether to the specific hardcoded address and not to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const sendAmount = ethers.parseEther("1.0");

    // Get initial balance of the target address
    const initialTargetBalance = await ethers.provider.getBalance(targetAddress);

    // Send Ether via go() from addr1
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    // Get final balance of the target address
    const finalTargetBalance = await ethers.provider.getBalance(targetAddress);

    // In the original, target should receive the Ether
    // In the mutant (address(0)), the Ether goes to burn address, so target balance unchanged
    expect(finalTargetBalance - initialTargetBalance).to.equal(sendAmount);
  });
});