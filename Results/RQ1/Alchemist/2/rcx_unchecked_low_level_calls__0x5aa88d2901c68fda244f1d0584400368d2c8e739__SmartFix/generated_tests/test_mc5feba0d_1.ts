import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mc5feba0d test", function () {
  it("should revert when Owner calls Command on mutant due to != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH to have balance for the call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner tries to call Command - should revert on mutant because require(msg.sender != Owner) fails for Owner
    await expect(
      instance.connect(owner).Command(addr1.address, "0x")
    ).to.be.reverted;
  });
});