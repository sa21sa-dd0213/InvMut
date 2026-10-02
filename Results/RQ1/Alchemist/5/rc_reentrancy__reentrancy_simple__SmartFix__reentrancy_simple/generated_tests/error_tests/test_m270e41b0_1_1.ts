import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m270e41b0 test", function () {
  it("should detect mutant by calling addToBalance with 0 wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the original contract, sending 0 wei should succeed (no revert)
    // On the mutant, the require condition becomes:
    // userBalance[msg.sender] + 0 - 1 >= userBalance[msg.sender]
    // which simplifies to userBalance[msg.sender] - 1 >= userBalance[msg.sender]
    // This is always false, causing a revert
    await expect(
      instance.connect(owner).addToBalance({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});