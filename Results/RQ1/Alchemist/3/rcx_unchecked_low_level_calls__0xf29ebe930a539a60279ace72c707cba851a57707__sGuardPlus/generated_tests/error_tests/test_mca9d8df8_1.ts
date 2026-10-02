import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant kill test - mca9d8df8", function () {
  it("should detect that target is address(this) instead of fixed external address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const externalTarget = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialExternalBalance = await ethers.provider.getBalance(externalTarget);
    const sendAmount = ethers.parseEther("1.0");

    // Fund the contract with some initial balance via fallback
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.5")
    });

    // Call go() from addr1 with 1 ETH
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    // Check that the external target did NOT receive the 1 ETH (mutant sends to itself)
    const finalExternalBalance = await ethers.provider.getBalance(externalTarget);
    expect(finalExternalBalance).to.equal(initialExternalBalance);
  });
});