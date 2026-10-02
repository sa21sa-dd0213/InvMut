import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test - mae4a5384", function () {
  it("should revert when non-owner calls withdraw (detects missing require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdraw from non-owner address - should revert in original
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;
  });
});