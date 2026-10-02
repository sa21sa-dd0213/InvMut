import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m2f1df5ef - withdraw modifier removal", function () {
  it("should revert when non-owner tries to withdraw after removing onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to make withdraw meaningful
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Attempt to withdraw from non-owner address - should revert in original, pass in mutant
    // If the modifier is removed, the call will succeed (killing the mutant)
    // We expect it to revert because the original contract requires onlyOwner
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});