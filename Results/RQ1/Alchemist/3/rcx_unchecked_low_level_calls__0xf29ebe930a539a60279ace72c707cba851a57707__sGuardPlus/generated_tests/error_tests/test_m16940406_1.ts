import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m16940406 test", function () {
  it("should detect mutant by verifying target address receives funds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialTargetBalance = await ethers.provider.getBalance(targetAddress);
    const sendAmount = ethers.parseEther("1.0");

    // Send ether to the contract via fallback
    const fundTx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });
    await fundTx.wait();

    // Call go() to trigger the transfer
    const goTx = await instance.connect(owner).go({ value: 0 });
    await goTx.wait();

    const finalTargetBalance = await ethers.provider.getBalance(targetAddress);
    const targetReceived = finalTargetBalance - initialTargetBalance;

    // In the original, target should receive the funds
    // In the mutant, target receives nothing (funds go to address(0))
    expect(targetReceived).to.equal(sendAmount);
  });
});