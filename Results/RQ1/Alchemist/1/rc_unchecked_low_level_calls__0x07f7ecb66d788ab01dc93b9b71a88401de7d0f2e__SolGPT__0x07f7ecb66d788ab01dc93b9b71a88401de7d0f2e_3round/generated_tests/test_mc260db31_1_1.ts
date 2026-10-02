import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mc260db31", function () {
  it("should reject wager with value less than betLimit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = addr1.address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Attempt to wager with value less than betLimit (should revert in original)
    const smallWager = ethers.parseEther("0.5");
    await expect(
      instance.connect(addr1).wager({ value: smallWager })
    ).to.be.reverted;
  });
});