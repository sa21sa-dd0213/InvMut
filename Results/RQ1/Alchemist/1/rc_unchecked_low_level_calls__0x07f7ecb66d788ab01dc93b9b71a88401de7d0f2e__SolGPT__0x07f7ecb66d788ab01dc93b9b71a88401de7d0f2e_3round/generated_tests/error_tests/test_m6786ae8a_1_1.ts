import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m6786ae8a - OpenToThePublic modifier removal", function () {
  it("should revert when non-owner calls OpenToThePublic on original, but succeed on mutant", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const whaleAddress = owner.address; // arbitrary valid address
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Initially openToPublic should be false
    // Attempt to call OpenToThePublic from non-owner address
    // In the original contract, this would revert due to onlyOwner modifier
    // In the mutant (where modifier is removed), it should succeed
    await expect(
      instance.connect(nonOwner).OpenToThePublic()
    ).to.be.reverted; // This will fail on mutant (succeeding call) but pass on original (revert)

    // Additional check: if we reach here without revert, the mutant is killed
    // because the non-owner was able to call OpenToThePublic
    // Verify the state changed (only possible on mutant)
    // Try calling wager to confirm the contract is now open to public
    const tx = instance.connect(nonOwner).OpenToThePublic();
    // If it doesn't revert, we can verify openToPublic is true by trying to wager
    await expect(tx).to.not.be.reverted;

    // Confirm the contract is now open by attempting a wager from nonOwner
    await instance.connect(nonOwner).wager({ value: wagerLimit });
    expect(await instance.hasPlayerWagered(nonOwner.address)).to.be.true;
  });
});