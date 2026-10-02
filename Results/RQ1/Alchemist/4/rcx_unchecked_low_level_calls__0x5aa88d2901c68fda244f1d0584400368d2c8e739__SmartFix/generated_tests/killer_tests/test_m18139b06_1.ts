import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m18139b06 by verifying only Owner can call withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Owner should be able to withdraw successfully (passes in original)
    const txOwner = await instance.connect(owner).withdraw();
    await txOwner.wait();

    // Fund the contract again for the second test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Non-owner should NOT be able to withdraw (reverts in original)
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;

    // If mutant is present:
    // - Owner's call would revert (breaking the first assertion)
    // - addr1's call would succeed (breaking the second assertion)
  });
});