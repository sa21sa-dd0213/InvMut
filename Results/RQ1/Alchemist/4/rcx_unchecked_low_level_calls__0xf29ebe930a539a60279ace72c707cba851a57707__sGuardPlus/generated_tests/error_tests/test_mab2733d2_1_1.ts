import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant test - mab2733d2", function () {
  it("should revert when target call fails in original but not in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Send ETH to the contract first so it has a balance to transfer
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Check that contract has balance
    const balanceBefore = await ethers.provider.getBalance(instanceAddress);
    expect(balanceBefore).to.equal(ethers.parseEther("1.0"));

    // Now call go() - the target address 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C is a precompile
    // which will fail the call, causing require to revert in original
    const tx = instance.connect(addr1).go({ value: ethers.parseEther("0.5") });

    // In original: should revert because target call fails
    // In mutant: no require check, so it will proceed to transfer all balance to owner
    await expect(tx).to.be.reverted;
  });
});