import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant mca8ea561", function () {
  it("should pass when calling multiplicate with msg.value = 0 on original, but revert on mutant where >= is changed to >", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for MultiplicatorX3)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so the multiplicate function can execute
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Call multiplicate with msg.value = 0 - should succeed on original, revert on mutant
    // The mutant's require checks > instead of >=, so msg.value=0 will fail the check
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});