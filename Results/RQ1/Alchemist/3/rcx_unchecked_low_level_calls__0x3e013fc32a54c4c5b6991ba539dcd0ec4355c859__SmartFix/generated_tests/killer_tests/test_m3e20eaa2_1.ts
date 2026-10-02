import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test for m3e20eaa2", function () {
  it("should allow Owner to call Command (original behavior) - mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract first so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The original contract allows Owner to call Command; the mutant rejects Owner
    // So calling from Owner should succeed on original, but revert on mutant
    const data = "0x";
    await expect(
      instance.connect(owner).Command(addr1.address, data, { value: ethers.parseEther("0.5") })
    ).to.not.be.reverted;
  });
});