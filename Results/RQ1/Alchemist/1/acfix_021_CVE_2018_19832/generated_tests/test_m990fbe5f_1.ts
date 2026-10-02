import { expect } from "chai";
import { ethers } } from "hardhat";

describe("NewIntelTechMedia - Mutant m990fbe5f kill test", function () {
  it("should revert when blacklisted address calls getTokens() (original) but succeed on mutant", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    // First, call getTokens() from investor to get tokens and become blacklisted
    await contract.connect(investor).getTokens({ value: ethers.parseEther("1") });

    // Verify investor is now blacklisted
    expect(await contract.blacklist(investor.address)).to.be.true;

    // Now try to call getTokens() again from the blacklisted investor
    // On original contract this should revert due to onlyWhitelist modifier
    // On mutant this should succeed (no revert) because condition is always true
    await expect(
      contract.connect(investor).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});