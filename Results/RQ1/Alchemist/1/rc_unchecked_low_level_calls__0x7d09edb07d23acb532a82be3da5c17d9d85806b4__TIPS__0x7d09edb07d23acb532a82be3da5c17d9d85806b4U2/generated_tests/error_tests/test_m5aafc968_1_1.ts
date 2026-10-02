import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m5aafc968 test", function () {
  it("should revert donate() when contract is not open to public (isOpenToPublic modifier removed)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    // Deploy contract - openToPublic is false by default
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Attempt to call donate() when openToPublic is false
    // Original contract would revert due to isOpenToPublic modifier
    // Mutant removed the modifier so it would succeed
    const donationAmount = ethers.parseEther("0.5");

    // This should revert on original but not on mutant
    await expect(
      instance.connect(addr1).donate({ value: donationAmount })
    ).to.be.reverted;
  });
});