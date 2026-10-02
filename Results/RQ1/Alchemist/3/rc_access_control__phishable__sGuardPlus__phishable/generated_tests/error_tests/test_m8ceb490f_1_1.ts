import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m8ceb490f test", function () {
  it("should allow owner to withdrawAll and fail on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ether to the contract so there's balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to withdraw successfully in original contract
    // In mutant, this will revert because require(msg.sender != owner) fails for owner
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;
  });
});