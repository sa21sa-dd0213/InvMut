import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow Owner to withdraw and kill the mutant where require(msg.sender != Owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract so it has balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdraw - should succeed in original, revert in mutant
    const tx = instance.connect(owner).withdraw();
    await expect(tx).to.not.be.reverted;
  });
});