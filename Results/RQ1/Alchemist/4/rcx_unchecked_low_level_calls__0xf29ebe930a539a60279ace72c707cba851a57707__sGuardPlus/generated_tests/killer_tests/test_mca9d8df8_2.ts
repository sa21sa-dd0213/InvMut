import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mca9d8df8", function () {
  it("should detect mutant by checking external address balance after go() call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Record the initial balance of the fixed external address
    const externalAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialExternalBalance = await ethers.provider.getBalance(externalAddress);

    // Call go() with a non-zero value from addr1
    const sentValue = ethers.parseEther("0.5");
    const tx = await instance.connect(addr1).go({ value: sentValue });
    await tx.wait();

    // Check that the external address received exactly the sent value
    // In original: funds go to external address, then owner gets balance (but that's a separate transfer)
    // The key is that external address should have increased by msg.value from the call
    const finalExternalBalance = await ethers.provider.getBalance(externalAddress);
    expect(finalExternalBalance).to.equal(initialExternalBalance + sentValue);
  });
});