import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should revert when transferring 1 token to an address with max uint256 balance (kills mutant m073202b5)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000", 0);
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "Test", "TST");
    await instance.waitForDeployment();

    // First, give addr1 a very large balance by minting
    const maxUint256 = ethers.MaxUint256;
    const mintAmount = maxUint256 - initialSupply;
    await instance.connect(owner).mintToken(addr1.address, mintAmount);

    // Now addr1's balance is maxUint256
    // Transfer 1 token from addr1 to addr2 (who has 0 balance)
    // In the original: balanceOf[addr2] + 1 >= balanceOf[addr2] => 0 + 1 >= 0 => true, so it passes
    // In the mutant: balanceOf[addr2] * 1 >= balanceOf[addr2] => 0 * 1 >= 0 => true, also passes
    // So we need to test overflow on the receiving side instead

    // Give addr2 a balance of maxUint256 as well
    await instance.connect(owner).mintToken(addr2.address, maxUint256);

    // Now try to transfer 1 token from addr1 to addr2
    // Original: balanceOf[addr2] + 1 >= balanceOf[addr2] => maxUint256 + 1 >= maxUint256 => false (overflow check fails)
    // Mutant: balanceOf[addr2] * 1 >= balanceOf[addr2] => maxUint256 * 1 >= maxUint256 => true (passes incorrectly)
    // The original should revert, the mutant would not revert

    await expect(
      instance.connect(addr1).transfer(addr2.address, 1)
    ).to.be.reverted;
  });
});