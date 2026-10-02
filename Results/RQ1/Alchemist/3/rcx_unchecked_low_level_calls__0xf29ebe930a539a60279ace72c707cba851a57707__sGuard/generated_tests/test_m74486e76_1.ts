import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m74486e76", function () {
  it("should revert when calling go() because target is address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH first (fallback is payable)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Now call go() from a different account - it should fail because
    // sending ETH to address(0) via call{} will revert
    await expect(
      instance.connect(addr1).go({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});