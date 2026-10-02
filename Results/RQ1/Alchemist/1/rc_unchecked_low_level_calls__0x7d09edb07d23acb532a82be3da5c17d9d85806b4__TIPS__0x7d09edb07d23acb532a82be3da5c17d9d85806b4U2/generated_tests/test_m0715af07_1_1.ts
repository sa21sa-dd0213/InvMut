import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - wager value check", function () {
  it("should revert when wagering more than betLimit (original requires exact match)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open the contract to the public (onlyOwner)
    await instance.connect(owner).OpenToThePublic();

    // Attempt to wager with value greater than betLimit
    const overWager = ethers.parseEther("2");
    await expect(
      instance.connect(addr1).wager({ value: overWager })
    ).to.be.reverted;

    // Also verify that exact wager still works
    const exactWager = ethers.parseEther("1");
    await expect(
      instance.connect(addr1).wager({ value: exactWager })
    ).to.not.be.reverted;
  });
});