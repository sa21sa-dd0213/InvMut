import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m0672cb32 test", function () {
  it("should revert when external call to target address fails", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract B (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so it has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The target address in the contract is 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C
    // This address is a random address with no code, so calling it will fail
    // We call go() from a different account (attacker) with msg.value
    const tx = instance.connect(attacker).go({ value: ethers.parseEther("0.5") });

    // The original contract should revert because the external call fails
    // The mutant would not revert, which would make this test fail on the mutant
    await expect(tx).to.be.reverted;
  });
});