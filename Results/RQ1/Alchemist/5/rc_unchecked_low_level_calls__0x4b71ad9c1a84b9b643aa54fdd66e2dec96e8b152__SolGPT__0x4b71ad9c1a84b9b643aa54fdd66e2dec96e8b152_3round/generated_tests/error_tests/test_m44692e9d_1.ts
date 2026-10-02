import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - m44692e9d", function () {
  it("should revert when calling transfer with empty _tos array (mutant changes > to <)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // With an empty array, _tos.length = 0
    // Original: require(0 > 0) → false → reverts
    // Mutant: require(0 < 0) → false → also reverts
    // Both revert, so empty array test does NOT kill the mutant
    
    // To kill the mutant, we need a non-empty array
    // Original: require(1 > 0) → true → passes
    // Mutant: require(1 < 0) → false → reverts
    // This kills the mutant because original passes but mutant reverts
    
    const tokenAddress = addr1.address; // Using addr1 as the token contract (caddress)
    const recipients = [addr2.address]; // Non-empty array
    
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});