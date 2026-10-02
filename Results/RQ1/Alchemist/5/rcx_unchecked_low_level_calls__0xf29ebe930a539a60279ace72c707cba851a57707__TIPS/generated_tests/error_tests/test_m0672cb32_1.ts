import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m0672cb32 test", function () {
  it("should kill mutant by triggering failed external call and checking no transfer occurs", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial owner balance
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Attempt to call go() which will make an external call to a contract that cannot receive ETH
    // The target 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C is an EOA (externally owned account)
    // that will reject the call with value, causing the external call to fail
    const tx = instance.connect(attacker).go({ value: ethers.parseEther("0.5") });

    // In the original contract, this should revert because the external call fails
    // In the mutant, the revert is removed, so the transfer to owner would succeed
    // We expect the original to revert
    await expect(tx).to.be.reverted;

    // Verify owner balance hasn't changed (no transfer happened)
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance);
  });
});