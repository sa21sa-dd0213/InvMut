import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant ma37ded0f test", function () {
  it("should revert when non-owner calls withdraw on original, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Attempt to call withdraw from non-owner address
    // On original: should revert because msg.sender != Owner
    // On mutant (without require): should succeed and transfer balance to addr1
    const instanceAsAddr1 = instance.connect(addr1);
    await expect(instanceAsAddr1.withdraw()).to.be.reverted;
  });
});