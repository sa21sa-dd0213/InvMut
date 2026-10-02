import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mbf21c7a0: addToBalance with non-zero value should succeed on original but revert on mutant (== instead of >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // On the original contract, this call should succeed.
    // On the mutant (== instead of >=), it will revert because
    // userBalance[msg.sender] + msg.value != userBalance[msg.sender] when msg.value > 0.
    await expect(
      instance.connect(owner).addToBalance({ value: depositAmount })
    ).to.not.be.reverted;
  });
});