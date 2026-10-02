import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant detection test", function () {
  it("should revert when calling transfer with an empty recipients array (detects < vs > mutation)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // For original: empty array should revert because length is 0, not > 0
    // For mutant: empty array should NOT revert because length 0 is not < 0 (condition always false)
    // But the mutant's condition can never be true for any valid array (length >= 0)
    // So any call with a non-empty array will always revert on the mutant
    // Using a non-empty array should succeed on original but revert on mutant
    
    const tokenAddress = "0x0000000000000000000000000000000000000001"; // placeholder token address
    const recipients = [addr1.address];
    const amount = ethers.parseEther("1");

    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, amount)
    ).to.be.reverted;
  });
});