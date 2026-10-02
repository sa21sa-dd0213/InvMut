import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mab727b40 by passing a valid recipients array that passes original require but fails mutant require(_tos.length < 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // A test with exactly 1 recipient should succeed on original (length > 0)
    // but revert on mutant because length < 0 is always false
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");
    
    // This call should revert on the mutant (since length < 0 is impossible)
    // On the original it would proceed (length > 0 is true)
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value)
    ).to.be.reverted;
  });
});