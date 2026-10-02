import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m74486e76 test", function () {
  it("should send Ether to the specific hardcoded address, not to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialTargetBalance = await ethers.provider.getBalance(targetAddress);
    const sendAmount = ethers.parseEther("1.0");

    // Send Ether to contract via go() from a different account
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });

    // Call go() to trigger the transfer
    const tx = await instance.connect(addr1).go();
    await tx.wait();

    // Check that target address received the Ether
    const finalTargetBalance = await ethers.provider.getBalance(targetAddress);
    expect(finalTargetBalance - initialTargetBalance).to.equal(sendAmount);

    // Check that contract balance is zero
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});