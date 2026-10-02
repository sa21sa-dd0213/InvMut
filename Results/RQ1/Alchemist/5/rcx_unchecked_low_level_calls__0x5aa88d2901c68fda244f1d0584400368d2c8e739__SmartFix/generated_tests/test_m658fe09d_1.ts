import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m658fe09d test", function () {
  it("should revert when non-owner calls Command on original, but succeed on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    // No constructor arguments needed for MultiplicatorX3
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so the balance check isn't trivial
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Try to call Command from unauthorized address (attacker)
    // The call should revert on original (with require), but succeed on mutant
    const targetAddress = attacker.address;
    const emptyData = "0x";

    // This call should revert on original contract, but will pass on mutant
    await expect(
      instance.connect(attacker).Command(targetAddress, emptyData, {
        value: ethers.parseEther("0.1")
      })
    ).to.be.reverted;
  });
});