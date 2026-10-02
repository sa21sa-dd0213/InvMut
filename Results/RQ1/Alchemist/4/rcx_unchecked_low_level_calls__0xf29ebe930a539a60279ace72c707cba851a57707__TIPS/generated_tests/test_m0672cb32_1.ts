import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m0672cb32 test", function () {
  it("should revert when target call fails in go()", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH first so it has balance to attempt transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The target address 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C is a random address
    // that likely has no code, so a .call with ETH will fail (no receive/fallback)
    // In the original contract, this failure triggers revert()
    // In the mutant, the revert() is removed, so it won't revert
    const tx = instance.connect(attacker).go({ value: ethers.parseEther("0.1") });
    
    await expect(tx).to.be.reverted;
  });
});