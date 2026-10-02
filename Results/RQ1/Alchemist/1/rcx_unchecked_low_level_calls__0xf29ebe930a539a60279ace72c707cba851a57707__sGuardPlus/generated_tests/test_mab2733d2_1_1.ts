import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mab2733d2", function () {
  it("should kill mutant by forcing external call failure and checking revert", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some ETH
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Call go() from addr1 with ETH - this should revert in the original
    // because the hardcoded target (0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C) 
    // is likely an EOA or non-existent, causing the external call to fail
    const tx = instance.connect(addr1).go({ value: ethers.parseEther("0.1") });

    // Original should revert because the hardcoded target likely fails
    // Mutant should succeed and transfer balance to owner
    await expect(tx).to.be.reverted;
  });
});