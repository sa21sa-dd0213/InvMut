import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant kill test - m2edef8f2", function () {
  it("should revert when target call fails in original, but mutant would not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a contract that rejects ETH to act as the target
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Deploy B with the rejector's address as the target
    const BFactory = await ethers.getContractFactory("B");
    const instance = await BFactory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call go() with ETH - this should revert in original because target rejects ETH
    // In the mutant, it would not revert and would send balance to owner
    await expect(
      instance.connect(owner).go({ value: ethers.parseEther("0.1") })
    ).to.be.reverted;
  });
});