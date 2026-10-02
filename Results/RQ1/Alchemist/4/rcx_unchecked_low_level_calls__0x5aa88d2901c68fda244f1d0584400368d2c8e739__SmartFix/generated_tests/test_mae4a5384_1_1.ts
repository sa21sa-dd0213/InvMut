import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection test", function () {
  it("should kill mutant mae4a5384 by calling withdraw from non-owner and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdraw has a balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdraw from a non-owner address
    // In the original contract, this should revert due to the require(msg.sender == Owner) check
    // In the mutant where the require is removed, it will not revert
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;
  });
});