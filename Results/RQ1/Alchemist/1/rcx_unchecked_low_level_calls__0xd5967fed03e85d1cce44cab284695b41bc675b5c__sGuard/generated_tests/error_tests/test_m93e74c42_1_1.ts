import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original behavior) and fail on mutant that removes the > 0 check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transfer with an empty _tos array - should revert in original
    // but succeed in mutant (killing it)
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});