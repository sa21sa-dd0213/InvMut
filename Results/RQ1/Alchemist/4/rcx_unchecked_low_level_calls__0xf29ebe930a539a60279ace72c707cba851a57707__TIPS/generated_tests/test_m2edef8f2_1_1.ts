import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m2edef8f2 test", function () {
  it("should revert when external call to hardcoded target fails", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial ETH to test balance transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call go() with msg.value - the hardcoded target 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C
    // is unlikely to accept ETH or have a payable fallback, so the call should fail.
    // In the original contract this would revert; in the mutant (false condition) it would not.
    const tx = instance.connect(attacker).go({ value: ethers.parseEther("0.1") });

    // The original contract reverts on failed external call, so we expect revert
    await expect(tx).to.be.reverted;
  });
});