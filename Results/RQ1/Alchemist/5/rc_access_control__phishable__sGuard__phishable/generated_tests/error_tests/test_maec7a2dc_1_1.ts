import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant maec7a2dc", function () {
  it("should fail to withdraw when called by the original deployer because owner is set to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract first so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdraw as the owner - should revert because owner is address(0) in the mutant
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});