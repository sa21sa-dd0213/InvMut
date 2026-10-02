import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - m8ceb490f", function () {
  it("should revert when owner calls withdrawAll (mutant changes == to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // In the mutant, require(msg.sender != owner) means owner's call should revert
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});