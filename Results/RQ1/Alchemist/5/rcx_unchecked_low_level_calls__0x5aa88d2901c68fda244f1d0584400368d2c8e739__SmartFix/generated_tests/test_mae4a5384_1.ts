import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when withdraw is called by non-owner (kills mutant that removes require(msg.sender == Owner))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, send some ether to the contract so it has a balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt to withdraw from non-owner address - should revert in original, but not in mutant
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;
  });
});